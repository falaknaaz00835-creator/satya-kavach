import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SatyaKavach — Digital Forensics Workbench",
    template: "%s · SatyaKavach",
  },
  description:
    "Five forensic instruments for Bharat's most common digital frauds — fake UPI screenshots, malicious QR codes, job-scam offer letters, deepfake calls and tampered documents. Verdicts you can hand to a bank or a cyber-cell.",
  keywords: [
    "UPI fraud",
    "fake screenshot detector",
    "QR scam",
    "deepfake",
    "cyber forensics India",
    "digital arrest",
  ],
  applicationName: "SatyaKavach",
  authors: [{ name: "SatyaKavach" }],
  openGraph: {
    title: "SatyaKavach — Digital Forensics Workbench",
    description:
      "Inspect the screenshot, the QR, the letter, the call, the document. Then keep the receipt.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F3EC" },
    { media: "(prefers-color-scheme: dark)", color: "#141412" },
  ],
  width: "device-width",
  initialScale: 1,
};

const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem('sk.theme');
    var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? stored === 'dark' : sys;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="bg-paper text-ink antialiased selection:bg-[#f4d9c9]">
        {children}
      </body>
    </html>
  );
}
