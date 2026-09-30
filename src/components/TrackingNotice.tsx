import type { MeetingSettings } from '@/lib/attendance';

/**
 * What this meeting measures, said to the person being measured.
 *
 * The host's panel is private -- students cannot see each other's attention
 * or anyone's alerts -- but the fact that it exists is not a secret. A
 * student who is told what is recorded, and where it is computed, can decide
 * how to take part; one who finds out afterwards has been watched.
 */
const TrackingNotice = ({
  settings,
  isHost,
}: {
  settings: MeetingSettings;
  isHost: boolean;
}) => {
  if (!settings.attendance && !settings.attention) {
    return (
      <p className="w-full text-center text-sm text-gray-600 px-4">
        Attendance and attention insights are off for this meeting.
      </p>
    );
  }
  return (
    <div className="w-full bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-blue-200/40 text-sm text-gray-700">
      <h2 className="font-semibold text-gray-900 mb-2">
        {isHost ? 'What your participants will be told' : 'In this meeting'}
      </h2>
      <ul className="space-y-1.5">
        {settings.attendance && (
          <li>
            <span className="font-medium">Attendance is recorded</span> — when you join, leave and
            rejoin, and how long you stay.
          </li>
        )}
        {settings.attention && (
          <li>
            <span className="font-medium">Attention insights are on</span> — your device estimates
            whether you are facing the screen. Your video is analysed on your own device and never
            recorded; only minutes are sent.
          </li>
        )}
        <li className="text-gray-500">
          Only the host sees the results, and you can see your own record afterwards in History.
        </li>
        {settings.attention && !isHost && (
          <li>
            <a href="/check" target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">
              Check how your camera reads you
            </a>
          </li>
        )}
      </ul>
    </div>
  );
};

export default TrackingNotice;
