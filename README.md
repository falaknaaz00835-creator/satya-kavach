# SatyaKavach — Digital Forensics Workbench

> **Universal 5-in-1 digital scam & fake-detection shield for Bharat**

A production-grade, full-stack forensic workbench for detecting the most common digital frauds targeting Indian citizens.

## Features

| Stage | Module | Status | Capabilities |
|-------|--------|--------|--------------|
| 0 | Core Workbench Shell & Navigation | ✅ Live | Paper-and-Ink design system, intake desk, ⌘K palette, evidence ledger, dark mode, English & Hindi |
| 1 | Fake UPI Payment Screenshot Inspector | ✅ Live | ELA (Error Level Analysis), NPCI UTR validation, bank handles |
| 2 | Malicious QR Code & Trap-Link Scanner | ✅ Live | Reverse phishing detection, NPCI intent parser, trap-link analysis |
| 3 | Fake Job & Internship Offer Letter Screener | ✅ Live | MCA/CIN verification, salary anomaly detector, upfront fee flags |
| 4 | Video & Face-Swap Deepfake Call Inspector | ✅ Live | WhatsApp digital arrest detector, temporal artifact & seam analysis |
| 5 | Fake Document & Tampered Bill Inspector | ✅ Live | Metadata tampering, font mismatch, forged court/utility notices |
| 6 | Kavach AI Security Copilot (NVIDIA Nemotron) | ✅ Live | Triage agent, Hindi/Hinglish/English, Nebius Token Factory routing |

---

## ⚡ Powered by NVIDIA Nemotron & Nebius Token Factory

SatyaKavach features **Kavach Copilot**, an AI-powered forensic security agent built specifically for the **Nebius x NVIDIA Hackathon** (Best Apps & Agents Track).

### Dual-Model Routing Architecture
```
User Query (Hindi / Hinglish / English)
                │
                ▼
  ┌───────────────────────────┐
  │ Nebius Token Factory API │
  └─────────────┬─────────────┘
                │
     ┌──────────┴──────────┐
     ▼                     ▼
[Nemotron-Nano]     [Nemotron-70B-Instruct]
 Fast Intent &       Deep Forensic Reasoning &
 Risk Scoring        Multi-step Citizen Action Plans
 (<150ms latency)    (NPCI / CERT-In compliance)
                │
                ▼
  Structured Forensic Output
  • Severity Badge: HIGH RISK / CAUTION / SAFE
  • 3 Plain-Language Action Steps for Citizens
  • 1-Click Action: Auto-switches to target module
```

### Key Capabilities:
- **NVIDIA Nemotron-70B Inference via Nebius Token Factory:** Provides deep contextual understanding of localized Indian scams, including "Digital Arrest" impersonation, WhatsApp video call syndicates, QR cashback traps, and fake registration fee rackets.
- **Zero-Key Offline Fallback Engine:** Features a context-aware local forensic reasoning engine that runs 100% offline if `NEBIUS_API_KEY` is not set—guaranteeing pitch resilience during live stage demos with zero downtime or runtime errors.
- **Contextual Language Support:** Seamlessly responds to questions in English, Hindi (Devanagari), and colloquial Hinglish (e.g., *"police video call digital arrest threaten kar rahe hain"*).
- **1-Click Triage Routing:** Directly opens and primes the matching forensic module (`upi`, `qr`, `job`, `deepfake`, or `document`) so non-technical citizens can immediately inspect suspicious files.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **AI / LLM:** NVIDIA Nemotron-70B-Instruct routed via Nebius Token Factory Serverless API
- **Styling:** Tailwind CSS with custom SatyaKavach design tokens
- **Icons:** Lucide React
- **Forensics:** HTML5 Canvas ELA (Error Level Analysis), NPCI UTR validation, QR payload decoder, MCA registry cross-checks

---

## Environment Configuration

To enable live NVIDIA Nemotron cloud inference via Nebius:

Create `.env.local` in the project root:
```env
NEBIUS_API_KEY="your_nebius_studio_api_key_here"
```

*(Note: If `NEBIUS_API_KEY` is omitted, SatyaKavach automatically engages the Zero-Key Offline Fallback Engine for flawless offline operation).*

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Design System — Paper & Ink

The interface is built to read like a forensic ledger rather than a SaaS dashboard: warm paper, hairline rules, editorial serif headlines, mono metadata and stamped verdicts. See [`docs/FRONTEND-ROADMAP.md`](docs/FRONTEND-ROADMAP.md) for the full rationale and the feature roadmap.

| Token | Value | Usage |
|-------|-------|-------|
| Paper | `#F6F3EC` | Document base (with a subtle fibre texture) |
| Card | `#FFFDF8` | Evidence surface |
| Rule | `#DFD9CB` | Hairlines, dividers, table rules |
| Ink | `#14140F` | Primary text |
| Vermillion (accent) | `#C8452B` | Active instrument, stamps — one job only |
| Trust Emerald | `#12715B` | Genuine / verified |
| Warning Ochre | `#A9700C` | Suspicious |
| Fraud Crimson | `#B3382B` | Fraud detected |
| Fonts | Fraunces · Inter · JetBrains Mono | Display · UI · every hash and timestamp |

### Interface at a glance

- **Intake desk (home):** one universal drop target for screenshots, videos, letters, bills and QR images — with clipboard paste. It detects the file type and routes it into the right instrument.
- **Instrument rail:** five numbered instruments (`01`–`05`), plus a 1930 helpline action.
- **Evidence ledger:** every run is written with module, verdict, risk score, hash and timestamp. Filter it, export it as hashed JSON, or print it.
- **Kavach copilot:** a consult panel (not a chatbot) with stamped risk, three numbered citizen steps and a one-click jump into the matching instrument.

### Keyboard

| Key | Action |
|-----|--------|
| `⌘K` / `Ctrl K` | Command palette |
| `1` – `5` | Open instrument 01–05 |
| `H` | Intake desk |
| `L` | Evidence ledger |
| `T` | Toggle night desk |
| `⌘V` | Paste a screenshot at the intake desk |

---

## Documentation

- [`docs/FRONTEND-ROADMAP.md`](docs/FRONTEND-ROADMAP.md) — design critique, what shipped, and the prioritised feature roadmap.
