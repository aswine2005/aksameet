'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ALERT_CHOICES, DEFAULT_SETTINGS, MeetingSettings } from '@/lib/attendance';
import { MAX_TITLE_LENGTH } from '@/lib/constants';

/** Create a meeting on the server and go to its lobby. Shared by the dialog and `/new`. */
export async function createMeeting(title: string, settings: MeetingSettings): Promise<string> {
  const response = await fetch('/api/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, settings }),
  });
  const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!response.ok || !data.id) throw new Error(data.error || `Failed with ${response.status}`);
  return data.id;
}

const NewMeetingDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [settings, setSettings] = useState<MeetingSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const id = await createMeeting(title, settings);
      router.push(`/${id}`);
    } catch (err) {
      setError((err as Error).message || 'Could not create the meeting.');
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="w-[min(30rem,calc(100vw-2rem))] rounded-3xl p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} className="p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900">New meeting</h2>
        <p className="mt-1 text-sm text-gray-600">
          Participants sign in to join, and are told what is measured before they do.
        </p>

        <label htmlFor="meeting-title" className="mt-6 block text-sm font-medium text-gray-900">
          Title
        </label>
        <input
          id="meeting-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE_LENGTH}
          placeholder="e.g. DBMS — Unit 3 lecture"
          className="mt-1 w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          autoFocus
        />

        <fieldset className="mt-5 space-y-3">
          <legend className="text-sm font-medium text-gray-900">Measure</legend>
          <Check
            label="Automatic attendance"
            hint="Joins, leaves, rejoins and minutes present."
            checked={settings.attendance}
            onChange={(attendance) => setSettings({ ...settings, attendance })}
          />
          <Check
            label="Attention insights"
            hint="Each student's device estimates whether they face the screen. Only you see it."
            checked={settings.attention}
            onChange={(attention) => setSettings({ ...settings, attention })}
          />
        </fieldset>

        {settings.attention && (
          <label className="mt-4 block text-sm">
            <span className="font-medium text-gray-900">Alert me when someone is away for</span>
            <select
              value={settings.awayAlertSeconds}
              onChange={(e) => setSettings({ ...settings, awayAlertSeconds: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2"
            >
              {ALERT_CHOICES.map((s) => (
                <option key={s} value={s}>
                  {s < 60 ? `${s} seconds` : `${s / 60} minute${s === 60 ? '' : 's'}`}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400"
          >
            {busy ? 'Creating…' : 'Create meeting'}
          </button>
        </div>
      </form>
    </dialog>
  );
};

const Check = ({
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
  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 hover:border-blue-300">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-5 w-5 accent-blue-600"
    />
    <span>
      <span className="block text-sm font-medium text-gray-900">{label}</span>
      <span className="block text-xs text-gray-500">{hint}</span>
    </span>
  </label>
);

export default NewMeetingDialog;
