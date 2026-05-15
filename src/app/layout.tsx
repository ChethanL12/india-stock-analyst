import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "India Stock Analyst — Institutional-Grade Equity Research",
  description:
    "AI-powered equity research for Indian stocks. Get institutional-grade analysis with real-time data from NSE, BSE, Screener, Trendlyne, Moneycontrol and more.",
  keywords: [
    "Indian stocks",
    "NSE",
    "BSE",
    "equity research",
    "stock analysis",
    "NIFTY",
    "SENSEX",
  ],
  openGraph: {
    title: "India Stock Analyst",
    description:
      "Institutional-grade equity research for Indian stocks, powered by AI.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "India Stock Analyst",
    description:
      "Institutional-grade equity research for Indian stocks, powered by AI.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
