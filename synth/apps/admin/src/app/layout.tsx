import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelTriangle, GeistPixelCircle } from "geist/font/pixel";
import { AdminHeader } from "@/components/AdminHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYNTH Admin",
  description: "Administrative control panel for SYNTH.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelTriangle.variable} ${GeistPixelCircle.variable}`}
    >
      <body>
        <main className="container">
          <AdminHeader />
          {children}
        </main>
      </body>
    </html>
  );
}
