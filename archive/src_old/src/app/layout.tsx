import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'C ARENA — Real-Time Multiplayer C Tournament',
  description:
    'University BCA First Year interactive C programming competition platform with real-time sync, mobile-first player dashboards, and high-definition public projector display.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#070B14] text-slate-100">{children}</body>
    </html>
  );
}
