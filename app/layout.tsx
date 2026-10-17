import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-surface text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
