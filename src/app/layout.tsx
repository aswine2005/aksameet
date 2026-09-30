import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

import '@stream-io/video-react-sdk/dist/css/styles.css';
import 'stream-chat-react/dist/css/v2/index.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'AksaMeet — classes with integrity, by AksaRank',
  description:
    'HD video meetings with automatic attendance and private, on-device attention insights for the host. Part of the AksaRank ecosystem.',
};

// Clerk reads its keys and sign-in/sign-up URLs from the NEXT_PUBLIC_CLERK_*
// environment variables (see .env.example).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
