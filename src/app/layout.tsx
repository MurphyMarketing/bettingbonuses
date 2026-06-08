import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  'Compare current sign-up offers and promo codes from legal US sportsbooks, prediction markets, racebooks, and DFS pick’em operators — with last-verified dates on every offer.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.bettingbonuses.com'),
  title: {
    default: 'BettingBonuses.com — US Betting Promos & Bonuses',
    template: '%s | BettingBonuses.com',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'BettingBonuses.com',
  openGraph: {
    type: 'website',
    siteName: 'BettingBonuses.com',
    title: 'BettingBonuses.com — US Betting Promos & Bonuses',
    description: SITE_DESCRIPTION,
    url: '/',
  },
  // Site-wide noindex until Step 14 (real content + redirect map in place).
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
