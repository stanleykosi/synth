import './globals.css';

export const metadata = {
  title: '__DROP_NAME__',
  description: '__DESCRIPTION__'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
