'use client';
import { ReactNode } from 'react';
import { useParams } from 'next/navigation';

import { MEETING_ID_REGEX } from '@/lib/constants';
import InvalidMeetingCode from '@/components/InvalidMeetingCode';
import MeetProvider from '@/contexts/MeetProvider';

export default function Layout({ children }: { children: ReactNode }) {
  const { meetingId } = useParams<{ meetingId: string }>();

  if (!MEETING_ID_REGEX.test(meetingId)) return <InvalidMeetingCode />;

  return <MeetProvider meetingId={meetingId}>{children}</MeetProvider>;
}
