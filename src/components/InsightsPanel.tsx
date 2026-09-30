import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import { useHostInsights } from '@/contexts/HostInsights';
import { useMeet } from '@/contexts/MeetProvider';
import { ALERT_STATES, STATE_LABEL, AttentionState } from '@/lib/attention';
import { ALERT_CHOICES, MeetingSettings, ParticipantSummary, formatDuration } from '@/lib/attendance';
import { clock } from '@/lib/client/format';
import { styleFor } from '@/lib/client/states';
import Avatar from './Avatar';
import Popup from './Popup';
import { SIDE_PANEL_CLASSNAME } from './ChatPopup';

interface Props {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'live' | 'settings';

const rank = (p: ParticipantSummary, alerted: Set<string>) =>
  alerted.has(p.userId) ? 0 : p.inMeeting ? (ALERT_STATES.includes(p.liveState as AttentionState) ? 1 : 2) : 3;

/**
 * The host's private panel: who is here, who is attending, and who has been
 * turned away from the class for longer than the host allows.
 */
const InsightsPanel = ({ meetingId, isOpen, onClose }: Props) => {
  const { data, alerted } = useHostInsights();
  const [tab, setTab] = useState<Tab>('live');

  const people = useMemo(
    () =>
      (data?.participants ?? [])
        .filter((p) => !p.isHost)
        .sort((a, b) => rank(a, alerted) - rank(b, alerted) || a.name.localeCompare(b.name)),
    [data, alerted]
  );
  const here = people.filter((p) => p.inMeeting);
  const measured = here.filter((p) => p.attentionPercent !== null);
  const classAttention = measured.length
    ? Math.round(measured.reduce((sum, p) => sum + (p.attentionPercent ?? 0), 0) / measured.length)
    : null;

  return (
    <Popup
      open={isOpen}
      onClose={onClose}
      title={
        <h2 className="flex items-center gap-2">
          Class insights
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            Only you
          </span>
        </h2>
      }
      className={clsx(SIDE_PANEL_CLASSNAME, 'sm:!w-[26rem] !max-w-[calc(100vw-2rem)]')}
    >
      <div className="flex h-[calc(100%-78px)] flex-col">
        <div className="mx-6 mb-3 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
          {(['live', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 rounded-md py-1.5 font-medium capitalize',
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'live' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mx-6 mb-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="In meeting" value={String(here.length)} />
              <Stat label="Class attention" value={classAttention === null ? '—' : `${classAttention}%`} />
              <Stat label="Alerts" value={String(alerted.size)} tone={alerted.size ? 'alert' : undefined} />
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {people.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-gray-500">
                  {data ? 'Nobody else has joined yet.' : 'Loading…'}
                </li>
              )}
              {people.map((p) => (
                <Row key={p.userId} person={p} alert={alerted.has(p.userId)} />
              ))}
            </ul>
            <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-6 py-3 text-sm">
              <a
                href={`/history/${meetingId}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                Full report
              </a>
              <a
                href={`/api/meetings/${meetingId}/report?format=csv`}
                className="font-medium text-blue-600 hover:underline"
              >
                Download CSV
              </a>
            </div>
          </div>
        ) : (
          <SettingsForm />
        )}
      </div>
    </Popup>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: 'alert' }) => (
  <div
    className={clsx(
      'rounded-xl border px-2 py-2',
      tone === 'alert' ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
    )}
  >
    <div className={clsx('text-lg font-bold', tone === 'alert' ? 'text-red-700' : 'text-gray-900')}>
      {value}
    </div>
    <div className="text-[11px] text-gray-500">{label}</div>
  </div>
);

const Row = ({ person, alert }: { person: ParticipantSummary; alert: boolean }) => {
  const style = styleFor(person.liveState);
  const state = person.liveState as AttentionState | null;
  return (
    <li
      className={clsx(
        'mb-1 flex items-center gap-3 rounded-xl px-3 py-2',
        alert ? 'bg-red-50 ring-1 ring-red-200' : 'hover:bg-gray-50'
      )}
    >
      <Avatar participant={{ name: person.name, image: person.image ?? undefined }} width={32} />
      <div className="min-w-0 grow">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-meet-black">{person.name}</span>
          {person.late && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">
              LATE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {person.inMeeting ? (
            style && state ? (
              <span className={clsx('rounded-full border px-1.5 py-px', style.chip)}>
                {style.short}
                {state !== 'attentive' && ` · ${clock(person.liveStateMs)}`}
              </span>
            ) : (
              <span>In meeting</span>
            )
          ) : (
            <span className="text-gray-400">Left</span>
          )}
          <span>{formatDuration(person.presentMs)}</span>
          {person.rejoins > 0 && <span>· rejoined {person.rejoins}×</span>}
        </div>
      </div>
      <div className="w-12 shrink-0 text-right" title={STATE_LABEL.attentive}>
        <div className="text-sm font-semibold text-gray-900">
          {person.attentionPercent === null ? '—' : `${person.attentionPercent}%`}
        </div>
        <div className="mt-1 h-1 rounded-full bg-gray-200">
          <div
            className={clsx(
              'h-1 rounded-full',
              (person.attentionPercent ?? 0) >= 70 ? 'bg-emerald-500' : (person.attentionPercent ?? 0) >= 40 ? 'bg-amber-500' : 'bg-rose-500'
            )}
            style={{ width: `${person.attentionPercent ?? 0}%` }}
          />
        </div>
      </div>
    </li>
  );
};

const SettingsForm = () => {
  const { meeting, saveSettings } = useMeet();
  const [draft, setDraft] = useState<MeetingSettings | null>(meeting?.settings ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDraft(meeting?.settings ?? null);
  }, [meeting?.settings]);

  if (!draft) return null;
  const change = (patch: Partial<MeetingSettings>) => {
    setDraft({ ...draft, ...patch });
    setMessage('');
  };
  const save = async () => {
    setSaving(true);
    try {
      await saveSettings(draft);
      setMessage('Saved. Participants pick this up within 15 seconds.');
    } catch {
      setMessage("Couldn't save. Try again.");
    }
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 text-sm">
      <Toggle
        label="Automatic attendance"
        hint="Record joins, leaves, rejoins and minutes present."
        checked={draft.attendance}
        onChange={(attendance) => change({ attendance })}
      />
      <Toggle
        label="Attention insights"
        hint="Each participant's device estimates whether they face the screen."
        checked={draft.attention}
        onChange={(attention) => change({ attention })}
      />
      <label className="mt-4 block font-medium text-gray-900">Alert me when someone is away for</label>
      <select
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
        value={draft.awayAlertSeconds}
        onChange={(e) => change({ awayAlertSeconds: Number(e.target.value) })}
      >
        {ALERT_CHOICES.map((s) => (
          <option key={s} value={s}>
            {s < 60 ? `${s} seconds` : `${s / 60} minute${s === 60 ? '' : 's'}`}
          </option>
        ))}
      </select>
      <label className="mt-4 block font-medium text-gray-900">Present if they attend at least</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={100}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2"
          value={draft.presentPercent}
          onChange={(e) => change({ presentPercent: Number(e.target.value) })}
        />
        <span className="text-gray-600">% of the meeting</span>
      </div>
      <label className="mt-4 block font-medium text-gray-900">Late after</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={240}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2"
          value={draft.lateAfterMinutes}
          onChange={(e) => change({ lateAfterMinutes: Number(e.target.value) })}
        />
        <span className="text-gray-600">minutes from the start</span>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
      {message && <p className="mt-2 text-center text-xs text-gray-600">{message}</p>}
    </div>
  );
};

const Toggle = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 border-b border-gray-100 py-3">
    <span>
      <span className="block font-medium text-gray-900">{label}</span>
      <span className="block text-xs text-gray-500">{hint}</span>
    </span>
    <input
      type="checkbox"
      className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);

export default InsightsPanel;
