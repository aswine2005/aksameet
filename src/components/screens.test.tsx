// @vitest-environment jsdom
//
// The host's screens, rendered with the shapes the API really returns. They
// sit behind sign-in, so this is where a missing field or a wrong assumption
// shows up before a teacher sees it.

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useParams: () => ({ meetingId: 'abc-defg-hij' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: { primaryEmailAddress: { emailAddress: 'kumar@example.com' } } }),
  useAuth: () => ({ getToken: async () => 'token' }),
  UserButton: () => null,
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
}));

import { emptyTotals } from '@/lib/attention';
import { DEFAULT_SETTINGS, ParticipantSummary } from '@/lib/attendance';
import { HostInsightsProvider } from '@/contexts/HostInsights';
import InsightsPanel from './InsightsPanel';
import AttentionBadge from './AttentionBadge';
import TrackingNotice from './TrackingNotice';
import ReportPage from '@/app/history/[meetingId]/page';
import HistoryPage from '@/app/history/page';

const MIN = 60_000;
const START = Date.UTC(2026, 8, 30, 4, 0);

const person = (over: Partial<ParticipantSummary>): ParticipantSummary => ({
  userId: 'user_x',
  name: 'Someone',
  email: 'someone@example.com',
  image: null,
  isHost: false,
  inMeeting: true,
  firstJoinAt: START,
  lastSeenAt: START + 50 * MIN,
  presentMs: 50 * MIN,
  percentOfMeeting: 83,
  joins: 1,
  rejoins: 0,
  lateByMs: 0,
  late: false,
  status: 'present',
  attentionPercent: 88,
  attention: { ...emptyTotals(), attentive: 40 * MIN, away: 5 * MIN },
  liveState: 'attentive',
  liveStateMs: 30_000,
  ...over,
});

const host = person({ userId: 'user_host', name: 'Dr. Kumar', isHost: true, attentionPercent: null });
const priya = person({ userId: 'user_priya', name: 'Priya', liveState: 'away', liveStateMs: 75_000, attentionPercent: 61 });
const arun = person({
  userId: 'user_arun',
  name: 'Arun',
  inMeeting: false,
  late: true,
  lateByMs: 14 * MIN,
  status: 'partial',
  percentOfMeeting: 40,
  presentMs: 24 * MIN,
  rejoins: 2,
  joins: 3,
  liveState: null,
});

afterEach(cleanup);

describe('the host’s live panel', () => {
  const live = {
    window: { startedAt: START, durationMs: 60 * MIN, live: true },
    participants: [host, priya, arun],
    alerts: [{ userId: 'user_priya', name: 'Priya', state: 'away', forMs: 75_000 }],
    now: START + 60 * MIN,
  };

  it('puts the student past the threshold first, with how long', () => {
    render(
      <HostInsightsProvider data={live}>
        <InsightsPanel meetingId="abc-defg-hij" isOpen onClose={() => undefined} />
      </HostInsightsProvider>
    );
    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]).getByText('Priya')).toBeTruthy();
    expect(within(rows[0]).getByText(/Looking away · 1m 15s/)).toBeTruthy();
    // The host is not listed as a student of their own class.
    expect(screen.queryByText('Dr. Kumar')).toBeNull();
    expect(screen.getByText('LATE')).toBeTruthy();
    expect(screen.getByText(/rejoined 2×/)).toBeTruthy();
    expect(screen.getByText('Only you')).toBeTruthy();
  });

  it('draws the tile badge for the host only, and only for students', () => {
    const { container, rerender } = render(
      <HostInsightsProvider data={live}>
        <AttentionBadge userId="user_priya" />
        <AttentionBadge userId="user_host" />
      </HostInsightsProvider>
    );
    expect(container.textContent).toContain('61%');
    expect(container.textContent).toContain('1m 15s');
    expect(container.querySelectorAll('[title]')).toHaveLength(1);
    // A student's browser has no live data at all, so nothing is drawn.
    rerender(
      <HostInsightsProvider data={null}>
        <AttentionBadge userId="user_priya" />
      </HostInsightsProvider>
    );
    expect(container.textContent).toBe('');
  });
});

describe('what a student is told', () => {
  it('names both measurements and where they happen', () => {
    render(<TrackingNotice settings={DEFAULT_SETTINGS} isHost={false} />);
    expect(screen.getByText(/Attendance is recorded/)).toBeTruthy();
    expect(screen.getByText(/analysed on your own device and never/)).toBeTruthy();
    expect(screen.getByText('Check how your camera reads you')).toBeTruthy();
  });

  it('says so when nothing is measured', () => {
    render(<TrackingNotice settings={{ ...DEFAULT_SETTINGS, attendance: false, attention: false }} isHost={false} />);
    expect(screen.getByText(/are off for this meeting/)).toBeTruthy();
  });
});

describe('the report', () => {
  const report = (isHost: boolean, participants: ParticipantSummary[]) => ({
    meeting: {
      id: 'abc-defg-hij',
      title: 'DBMS — Unit 3',
      hostName: 'Dr. Kumar',
      isHost,
      createdAt: new Date(START).toISOString(),
      endedAt: new Date(START + 60 * MIN).toISOString(),
      settings: DEFAULT_SETTINGS,
    },
    window: { startedAt: START, endedAt: START + 60 * MIN, durationMs: 60 * MIN, live: false },
    participants,
    timelines: isHost ? { user_priya: { [String(START / MIN + 3)]: 90, [String(START / MIN + 4)]: 20 } } : {},
    spans: isHost ? { user_priya: [[START, START + 50 * MIN]] } : {},
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows the host the whole class, with a timeline and an export', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(report(true, [host, priya, arun])));
    render(<ReportPage />);
    await waitFor(() => expect(screen.getByText('DBMS — Unit 3')).toBeTruthy());
    expect(screen.getByText('Download CSV').getAttribute('href')).toBe(
      '/api/meetings/abc-defg-hij/report?format=csv'
    );
    expect(screen.getAllByText('Partial').length).toBeGreaterThan(0);
    expect(screen.getByText(/Late 14m/)).toBeTruthy();
    expect(screen.getByText('Timeline')).toBeTruthy();
    expect(screen.getByTitle(/90% attentive/)).toBeTruthy();
    expect(screen.getByTitle(/20% attentive/)).toBeTruthy();
  });

  it('shows a student their own record and nothing else', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(report(false, [priya])));
    render(<ReportPage />);
    await waitFor(() => expect(screen.getByText('Your record')).toBeTruthy());
    expect(screen.queryByText('Download CSV')).toBeNull();
    expect(screen.queryByText('Timeline')).toBeNull();
    expect(screen.getByText('61%')).toBeTruthy();
  });
});

describe('history', () => {
  it('lists hosted meetings with their duration', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          hosted: [
            { id: 'abc-defg-hij', title: 'DBMS — Unit 3', createdAt: new Date(START).toISOString(), startedAt: START, endedAt: START + 62 * MIN, durationMs: 62 * MIN, live: false, participantCount: 14 },
          ],
          attended: [],
        })
      )
    );
    render(<HistoryPage />);
    await waitFor(() => expect(screen.getByText('DBMS — Unit 3')).toBeTruthy());
    expect(screen.getByText('1h 2m')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
  });
});
