import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'SYNTH | Autonomous Onchain Synthesis',
  description: 'From noise to signal. Watch an AI agent build and deploy onchain products daily.',
  openGraph: {
    title: 'SYNTH',
    description: 'Autonomous Onchain Synthesis Engine',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
