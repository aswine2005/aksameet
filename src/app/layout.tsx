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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppProvider>
      <html lang="en">
        <body>
          <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
            {children}
          </ClerkProvider>
        </body>
      </html>
    </AppProvider>
  );
}
