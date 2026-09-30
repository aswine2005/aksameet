import { STATE_LABEL } from '@/lib/attention';
import { formatDuration } from '@/lib/attendance';
import { buildReport, fail, handle, json, userId, validMeetingId } from '@/lib/server';
import { getMeeting, listParticipants } from '@/lib/store';

type RouteContext = { params: Promise<{ meetingId: string }> };

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  // Quote always, and neutralise a leading formula character: a name like
  // "=HYPERLINK(...)" must reach a spreadsheet as text, not as a formula.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

const time = (ms: number | null) => (ms === null ? '' : new Date(ms).toISOString());

/**
 * GET /api/meetings/:id/report[?format=csv]
 *
 * The host gets everyone, with per-minute attention. A student gets their own
 * row and nothing else -- they are entitled to see what was recorded about
 * them, and to nobody else's.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { meetingId } = await params;
  if (!validMeetingId(meetingId)) return fail(400, 'Invalid meeting code');
  try {
    const viewer = await userId();
    if (!viewer) return fail(401, 'Sign in first.');
    const meeting = await getMeeting(meetingId);
    if (!meeting) return fail(404, 'Meeting not found');

    const isHost = meeting.hostId === viewer;
    const report = buildReport(meeting, await listParticipants(meetingId), viewer, Date.now(), isHost);
    if (!isHost) {
      report.participants = report.participants.filter((p) => p.userId === viewer);
      report.timelines = {};
      report.spans = {};
    }

    if (new URL(request.url).searchParams.get('format') === 'csv') {
      if (!isHost) return fail(403, 'Only the host can export attendance.');
      const header = [
        'Name', 'Email', 'Role', 'Status', 'Late', 'First joined', 'Last seen',
        'Minutes present', 'Share of meeting (%)', 'Joins', 'Rejoins',
        'Attention (%)', ...Object.values(STATE_LABEL).map((l) => `${l} (min)`),
      ];
      const rows = report.participants.map((p) => [
        p.name, p.email, p.isHost ? 'Host' : 'Participant', p.status, p.late ? 'yes' : 'no',
        time(p.firstJoinAt), time(p.lastSeenAt), (p.presentMs / 60_000).toFixed(1),
        p.percentOfMeeting, p.joins, p.rejoins, p.attentionPercent ?? '',
        ...Object.keys(STATE_LABEL).map((k) =>
          (p.attention[k as keyof typeof p.attention] / 60_000).toFixed(1)
        ),
      ]);
      const lines = [
        [`${meeting.title} (${meeting._id})`, `Duration ${formatDuration(report.window.durationMs)}`],
        header,
        ...rows,
      ];
      const body = '﻿' + lines.map((r) => r.map(csvCell).join(',')).join('\r\n');
      return new Response(body, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="aksameet-${meeting._id}-attendance.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    return json(report);
  } catch (error) {
    return handle(error, 'build the report');
  }
}
