import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/contexts/auth-context';

export const metadata: Metadata = {
  title: 'SpeakSnap v3 - AI English Learning',
  description: 'Learn English through immersive AI conversations, flashcards, and diary writing',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
