import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SatyaKavach — Digital Forensics Workbench",
  description:
    "Universal 5-in-1 digital scam & fake-detection shield for Bharat. Detect fake UPI screenshots, malicious QR codes, job scam offer letters, deepfake calls, and tampered documents.",
  keywords: ["UPI fraud", "fake screenshot detector", "QR scam", "deepfake", "cyber forensics India"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="bg-bg text-ink font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
