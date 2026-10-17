# SatyaKavach — Digital Forensics Workbench

> **Universal 5-in-1 digital scam & fake-detection shield for Bharat**

A production-grade, full-stack forensic workbench for detecting the most common digital frauds targeting Indian citizens.

## Features

| Stage | Module | Status |
|-------|--------|--------|
| 0 | Core Workbench Shell & Navigation | ✅ Live |
| 1 | Fake UPI Payment Screenshot Inspector | ✅ Live |
| 2 | Malicious QR Code & Trap-Link Scanner | 🔜 Coming |
| 3 | Fake Job & Internship Offer Letter Screener | 🔜 Coming |
| 4 | Video & Face-Swap Deepfake Call Inspector | 🔜 Coming |
| 5 | Fake Document & Tampered Bill Inspector | 🔜 Coming |

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS with custom SatyaKavach design tokens
- **Icons:** Lucide React
- **Forensics:** HTML5 Canvas ELA (Error Level Analysis), NPCI UTR format validation, UPI handle registry

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Surface | `#F8FAFC` | App background |
| Card | `#FFFFFF` | Cards / panels |
| Ink | `#0F172A` | Primary text |
| Trust Emerald | `#059669` | Genuine / verified |
| Warning Amber | `#D97706` | Suspicious |
| Fraud Crimson | `#DC2626` | Fraud detected |
| Mono | JetBrains Mono | UTR, hashes, coords |
