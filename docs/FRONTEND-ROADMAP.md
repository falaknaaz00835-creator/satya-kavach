# SatyaKavach — Frontend Direction

**Status:** Design System 2.0 shipped on this branch
**Scope:** UI/UX critique, the changes already made, and the features that would take this from "hackathon demo" to a product a cyber-cell or a bank would actually deploy.

---

## 1. Why the old UI read as "AI-built"

The previous shell was competent, clean and completely generic. Every one of these is a tell:

| Tell | Why it happens | What it signals |
|---|---|---|
| Slate-grey + emerald, `rounded-xl`, `shadow-sm` on every surface | The default palette of every generated dashboard | Nothing was decided |
| Icon + title + subtitle + badge in every header | Symmetry applied uniformly | No hierarchy, no editorial voice |
| Five identical nav items with "LIVE" pills | Template navigation, no information design | The tool's own logic isn't reflected in the UI |
| Gradient cards (indigo → purple) | Decoration substituting for meaning | "AI generated this panel" |
| Emoji, `⚡`, "AI Security Agent" copy | Marketing voice inside a working tool | Demo, not instrument |
| Bubbles, pills, rounded-full everywhere | Softness as a personality | No point of view |
| Everything centred, everything equal weight | No grid discipline | Nothing is important |

**The fix is not "more polish". It is a point of view.**

The point of view chosen here: **SatyaKavach is a forensic ledger, not a dashboard.**
Paper, ink, hairline rules, mono metadata, serif headlines, stamped verdicts, numbered instruments, a verification date. It should feel like a document that happens to be software — because the output is a document a citizen hands to a bank or the police.

---

## 2. What shipped in this branch

### 2.1 Design system 2.0 — "Paper & Ink"

| Token | Value | Role |
|---|---|---|
| `paper` | `#F6F3EC` | Warm document base, with a 3.5% fibre texture |
| `card` | `#FFFDF8` | Evidence surface |
| `rule` / `rule-strong` | `#DFD9CB` / `#C7BFAD` | Hairlines and dividers |
| `ink` → `ink-faint` | `#14140F` → `#8A8A7D` | A single text scale, no grey soup |
| `accent` | `#C8452B` | Vermillion — stamps, active state, one job only |
| `trust` | `#12715B` | Genuine |
| `warning` | `#A9700C` | Caution |
| `fraud` | `#B3382B` | Fraud |
| Night desk | `#141412` / `#1B1B18` | Same document, lights off |

- **Type:** Fraunces (display, editorial serif) + Inter (UI) + JetBrains Mono (every number, hash, ID, timestamp). Three families with three jobs — this alone removes 80% of the generic feel.
- **Radius:** tightened to 3–7px. Only one circular element remains in the whole app (the module arrow). Pills removed from status chips — verdicts are **stamped rectangles**, like a rubber stamp on paper.
- **No gradients anywhere.** Depth comes from hairlines and 1px shadows.
- **Texture:** a subtly tiled fractal-noise layer on the body — invisible until you look, but it stops the UI reading as flat vectors.

### 2.2 Information architecture

- **The app now opens on an intake desk, not on module 01.** A citizen arrives with *a thing someone sent them*, not with a desire to "open the UPI inspector".
- **One universal drop target** for every artefact, with clipboard paste (`⌘V`) support. It identifies the file type, suggests the right instrument, and routes the file into it — no re-upload, no dead end.
- **Numbered instrument index** (01–05), each row carrying method + accepted formats. Reads like a table of contents, scans in one pass.
- **Session desk** on the home screen: inspected / fraud / clean counters and the last three ledger lines.
- **Helpline block** (1930, 112, cybercrime.gov.in) is on the landing screen, in ink-on-paper, unmissable. This is the single most useful piece of UI in the product.
- **Navigation:** 80px icon rail on desktop (numbered, with an accent tick for the active instrument) + bottom tab bar on mobile. The old 256px sidebar was eating a third of a 13" screen for five links.

### 2.3 Interaction layer

- **Command palette (`⌘K`)** — jump to any instrument, switch theme, switch language, open the ledger. Arrow keys + Enter, fuzzy-ish matching.
- **Keyboard grammar** — `1–5` instruments, `H` desk, `L` ledger, `T` theme, `⌘K` palette, `Esc` closes overlays.
- **Evidence ledger with persistence** — every run writes module, verdict, risk score, hash, timestamp to `localStorage`, survives refresh, filterable by instrument, exportable as hashed JSON, printable. This is the difference between a demo and a workbench: **the work leaves a trace.**
- **Theme and language persisted**; no flash of wrong theme (inline pre-paint bootstrap).
- **Motion choreography** — staggered 8–10px rises on the landing composition, 220ms overlays, and a full `prefers-reduced-motion` opt-out.

### 2.4 Consistency sweep

- AI Copilot re-skinned from emerald chatbot to a **consult desk**: hairline panel, serif header, numbered action steps, verdict stamp, mono telemetry footer.
- Grounding card de-gradiented from indigo/purple to paper + accent rule; sources became a hairline list.
- Module headers moved to the editorial type scale; emerald icon tiles replaced with neutral stamps.
- Ledger rows in modules now pass their verdict up, so the ledger says *what* was found, not just *that* something ran.

---

## 3. What to build next

Ordered by **citizen impact per week of work**, not by novelty.

### Tier 1 — next two weeks (a forensics tool earns trust here)

1. **Before/after ELA slider.** Overlay the heatmap on the screenshot with a draggable split handle and a zoom-to-region loupe. Today the heatmap is a toggle with `opacity-30` — a magnification and split view converts "score 74" into "the amount digits were repainted".
2. **"Why this verdict" panel, always visible.** Three lines: what was checked, what failed, what it means. Every confidence number must be traceable to an evidence line. Never show a percentage without its evidence.
3. **Print-grade evidence receipt (PDF).** The ledger already exports JSON; add a print stylesheet document with the screenshot thumbnail, hash, timestamp, verdict stamp, and a QR back to the record. Banks accept paper.
4. **Shareable verdict link.** Encode the finding (module, verdict, hash prefix, timestamp — never the image) into a URL parameter. A citizen can send it to a seller or an officer. No backend needed.
5. **Native share + copy summary.** `navigator.share()` with a one-tap "send this to my bank" text on mobile.
6. **PWA install + offline shell.** Victims often have poor connectivity at the exact moment of fraud. Offline capability is a safety feature, not a nicety.
7. **Large-type accessibility mode.** A 1.25×/1.5× text toggle; fraud disproportionately hits older users. Persist it with the other preferences.

### Tier 2 — the next month (differentiation)

8. **Case workspace.** Attach several artefacts to one case (screenshot + chat export + letter), one verdict per case, one narrative. Today each run is an orphan.
9. **Live QR camera scanner.** `getUserMedia` + `jsQR` on a stabilised scan loop, torch control, haptic confirm. Scanning a QR should not require a screenshot first.
10. **Frame scrubber for deepfake video.** Timeline with per-frame artefact scores and pinned suspicious frames — the single most convincing interaction in this category.
11. **OCR review step.** Extract amount, UTR, VPA and payee from the image, show them as editable fields *before* analysis. Low-literacy users can confirm what the machine read; analysts get clean data.
12. **Low-bandwidth + 8 more languages.** Marathi, Tamil, Telugu, Bengali, Kannada, Gujarati, Punjabi, Odia, plus Hinglish romanised input. Text strings must move to a real dictionary file (see §5).
13. **Voice input for the copilot.** Web Speech API, Hindi + Hinglish. Many users will describe a scam faster than they can type it.
14. **Redaction tool.** Blur account numbers, names and phone numbers before exporting/screenshotting a case. Privacy by default.
15. **File inspector sidebar.** EXIF, container, resolution, re-save history, editing-tool signatures — the "boring" metadata that wins arguments.

### Tier 3 — the quarter (institutional)

16. **Chain of custody.** Append-only ledger with per-entry hashes chained to the previous entry, exported with a verification script. This is what makes evidence admissible-adjacent and makes the product credible to a cyber-cell.
17. **Verification page** (`/verify/<hash>`) that re-checks an exported bundle against its digest.
18. **Partner dashboard** for banks/cyber-cells: aggregate scam patterns by district, top forged handle suffixes, trending trap domains — with no PII.
19. **A design-token package + Storybook**, so the instruments stop drifting.
20. **E2E + visual regression tests** (Playwright) on the four money paths: intake → verdict → ledger → export. Screenshot diffs catch the drift that killed the old UI.

---

## 4. UX rules to hold the line

1. **A verdict must never be a bare number.** Score + evidence + plain-language sentence, in that order of visual weight.
2. **One accent colour, one job.** Vermillion means "this needs your attention". If it appears in a header, it means nothing.
3. **Metadata is mono.** Hashes, IDs, timestamps, scores, latencies. Never Inter.
4. **No card inside a card inside a card.** Depth is a hairline, not a shadow.
5. **Every screen has one primary action and it is visually singular.**
6. **The helpline is never more than one glance away.**
7. **Motion explains a transition, never decorates an entrance twice.**
8. **Copy is written by a human:** "No employer charges you to be hired", not "AI-powered screening solution".

---

## 5. Engineering guardrails

- **i18n:** move all inline `lang === "en" ? … : …` strings into `lib/i18n/{en,hi}.ts` before adding a third language. Typed keys, no runtime lookup misses. This is currently the largest piece of UX debt.
- **Design tokens:** the palette lives in `tailwind.config.js` only; no hex codes inside components (exception: the two pre-paint bootstrap colours in `layout.tsx`).
- **Performance budget:** LCP < 1.8s on a 4G Moto G, first-load JS < 200kB gzip, CLS < 0.02. Canvas/ELA work must stay off the main thread where possible (`createImageBitmap` + Web Worker).
- **Accessibility target:** WCAG 2.2 AA. Check contrast on `ink-faint` for 10px text, ensure every icon-only control has `aria-label`, ensure the palette and drawers trap and restore focus.
- **Error states:** every API call needs a designed failure — a paper-styled inline notice and a retry, never `console.error` alone.

---

## 6. What not to do

- No purple/indigo gradients, glassmorphism, glowing orbs, or "AI sparkle" icons.
- No emoji in product chrome.
- No `rounded-full` pills for status; no badges that only say "LIVE".
- No animated background blobs, particles, or Three.js hero.
- No dashboard of fake charts. If there is no data, say so in words.
- No dark-pattern urgency ("Only 2 checks left!"). The fraudsters do that; we don't.
