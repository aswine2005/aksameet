import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

import AppProvider from '../contexts/AppProvider';

import '@stream-io/video-react-sdk/dist/css/styles.css';
import 'stream-chat-react/dist/css/v2/index.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aksa Meet - Real-Time Video Calls & Meetings',
  description:
    'High-definition real-time video meetings powered by Aksa Meet. Connect, collaborate, and share your screen with crystal-clear audio and video.',
};

// Clerk reads its keys and sign-in/sign-up URLs from the NEXT_PUBLIC_CLERK_*
// environment variables (see .env.example).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AppProvider>{children}</AppProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
