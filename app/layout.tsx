import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/*
 * Nunito Sans, self-hosted. next/font/google fetches from fonts.googleapis.com
 * at build time, which fails behind a proxy or offline and silently drops the
 * app onto a fallback face. These are the same variable woff2 files Google
 * serves for the latin subset, checked into the repo so the build never
 * depends on the network.
 */
const nunitoSans = localFont({
  src: [
    { path: "./fonts/nunito-sans-latin.woff2", weight: "200 1000", style: "normal" },
    { path: "./fonts/nunito-sans-latin-italic.woff2", weight: "200 1000", style: "italic" },
  ],
  variable: "--font-nunito-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BIL RMS · Researcher Console",
  description:
    "Behavioural Insights Lab Research Management System — researcher console",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunitoSans.variable} h-full antialiased`}>
      <body className="flex h-full flex-col overflow-hidden">{children}</body>
    </html>
  );
}
