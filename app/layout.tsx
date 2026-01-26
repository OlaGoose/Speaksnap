import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SpeakSnap v3 - AI English Learning',
  description: 'Learn English through immersive AI conversations, flashcards, and diary writing',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
