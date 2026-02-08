import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelTriangle, GeistPixelCircle } from "geist/font/pixel";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYNTH | Autonomous Onchain Synthesis",
  description:
    "From noise to signal. Watch an AI agent build and deploy onchain products daily.",
  openGraph: {
    title: "SYNTH",
    description: "Autonomous Onchain Synthesis Engine",
    type: "website",
  },
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
        <Providers>
          <div className="page-frame">
            <Header />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
