import type { Metadata } from 'next';
import './globals.css';
import { AdminHeader } from '@/components/AdminHeader';

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
        <main className="container">
          <AdminHeader />
          {children}
        </main>
      </body>
    </html>
  );
}
