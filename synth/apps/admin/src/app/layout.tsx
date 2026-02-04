import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SYNTH Admin',
  description: 'Administrative control panel for SYNTH.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
