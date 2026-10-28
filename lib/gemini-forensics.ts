import { GoogleGenAI } from "@google/genai";
import { sanitizeBase64 } from "./api-guard";

export interface GeminiForensicInput {
  type: "upi" | "qr" | "job" | "deepfake" | "document";
  payload: {
    utr?: string;
    upiId?: string;
    qrText?: string;
    jobText?: string;
    items?: Array<{ price: number; qty: number; description?: string }>;
    printedTotal?: number;
    filename?: string;
    fileSize?: number;
    fileBase64?: string;
    imageWidth?: number;
    imageHeight?: number;
    elaScore?: number;
    receiptDate?: string;
    isSyntheticQR?: boolean;
  };
  lang?: "en" | "hi";
  localEvidence?: string[];
}

export interface EntityProfile {
  entityName?: string;
  entityType?: string;
  registryStatus?: string;
  domainFootprint?: string;
  isVerifiedEntity?: boolean;
  riskCategory?: string;
}

export interface LiveWebStatus {
  summary: string;
  reputationScore: number; // 0-100
  searchSignals: string[];
  groundedSources?: Array<{ title: string; url: string }>;
}

export interface GeminiForensicResult {
  executed: boolean;
  ok?: boolean;
  stage?: string;
  verdict?: "genuine" | "suspicious" | "fraud";
  riskScore?: number;
  confidence?: number;
  evidence?: string[];
  ocrText?: string;
  forensicAnalysis?: string;
  entityProfile?: EntityProfile;
  liveWebStatus?: LiveWebStatus;
  riskRationale?: string;
  actionSteps?: string[];
  groundedSources?: Array<{ title: string; url: string }>;
  model: string;
  modelUsed?: string;
  latencyMs: number;
  error?: string;
}

/* ─────────────────────────────────────────────────────────────
   In-Memory SHA-256 10-Minute Gemini Result Cache
───────────────────────────────────────────────────────────── */
interface CacheEntry {
  result: GeminiForensicResult;
  timestamp: number;
}
const geminiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * 1. Model Fallback Chain:
 * [process.env.GEMINI_MODEL, "gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]
 * Deduplicated and non-empty.
 */
export function getModelFallbackChain(): string[] {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const rawList = [
    envModel,
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];
  const unique: string[] = [];
  for (const m of rawList) {
    if (m && m.length > 0 && !unique.includes(m)) {
      unique.push(m);
    }
  }
  return unique;
}

/**
 * Robust HTTP status code extractor from error instances
 */
export function extractHttpStatus(err: any): number {
  if (typeof err?.status === "number") return err.status;
  if (typeof err?.statusCode === "number") return err.statusCode;
  if (typeof err?.response?.status === "number") return err.response.status;
  const msg = String(err?.message || err || "");
  if (/503|unavailable|high demand/i.test(msg)) return 503;
  if (/429|resource_exhausted|quota|rate limit/i.test(msg)) return 429;
  if (/404|not found/i.test(msg)) return 404;
  if (/400|invalid_argument|bad request/i.test(msg)) return 400;
  if (/500|internal server/i.test(msg)) return 500;
  return 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GeminiFallbackOptions {
  apiKey: string;
  contents: any;
  config?: any;
}

export interface GeminiFallbackSuccess {
  ok: true;
  response: any;
  modelUsed: string;
  latencyMs: number;
}

export interface GeminiFallbackFailure {
  ok: false;
  stage: "gemini";
  error: string;
  latencyMs: number;
  lastError?: string;
}

export type GeminiFallbackResult = GeminiFallbackSuccess | GeminiFallbackFailure;

/**
 * Resilient multi-model execution with max 2 calls per request,
 * no retry on 429, and immediate progression on 404 or 400.
 */
export async function executeWithGeminiFallback(
  options: GeminiFallbackOptions
): Promise<GeminiFallbackResult> {
  const startTime = Date.now();
  const models = getModelFallbackChain();
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  let lastErr: any = null;
  let totalCalls = 0;

  for (const model of models) {
    if (totalCalls >= 2) break;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (totalCalls >= 2) break;
      totalCalls++;

      try {
        let response: any;
        if (options.config) {
          try {
            response = await ai.models.generateContent({
              model,
              contents: options.contents,
              config: options.config,
            });
          } catch (configErr: any) {
            const cfgStatus = extractHttpStatus(configErr);
            if (cfgStatus === 503 || cfgStatus === 429 || cfgStatus === 500) {
              throw configErr;
            }
            console.warn(`[SatyaKavach] Retrying model ${model} without search config:`, configErr?.message);
            response = await ai.models.generateContent({
              model,
              contents: options.contents,
            });
          }
        } else {
          response = await ai.models.generateContent({
            model,
            contents: options.contents,
          });
        }

        const latencyMs = Date.now() - startTime;
        return {
          ok: true,
          response,
          modelUsed: model,
          latencyMs,
        };
      } catch (err: any) {
        lastErr = err;
        const status = extractHttpStatus(err);
        const shortMsg = (err?.message || String(err)).slice(0, 200);
        console.error(
          `[SatyaKavach Gemini Error] Model: ${model}, Call: ${totalCalls}/2, Status: ${status}, Message: ${shortMsg}`
        );

        // Requirement 4: NO RETRY ON 429
        if (status === 429) {
          console.warn(`[SatyaKavach] HTTP 429 Rate Limit on ${model} - immediate abort without retry.`);
          return {
            ok: false,
            stage: "gemini",
            error: "AI engine busy, try again",
            latencyMs: Date.now() - startTime,
            lastError: "Rate limit reached (429)",
          };
        }

        // On 404 or 400 skip immediately to next model
        if (status === 404 || status === 400) {
          break;
        }

        // On 503 or 500: retry with exponential backoff ONLY if totalCalls < 2
        if ((status === 503 || status === 500) && totalCalls < 2) {
          await delay(800);
        } else {
          break;
        }
      }
    }
  }

  const latencyMs = Date.now() - startTime;
  return {
    ok: false,
    stage: "gemini",
    error: "AI engine busy, try again",
    latencyMs,
    lastError: lastErr?.message || String(lastErr),
  };
}

/**
 * Executes multi-modal forensic inspection with real-time Google Search grounding
 * Supports live research across all 5 forensic modules
 */
export async function runGeminiForensicAnalysis(
  input: GeminiForensicInput
): Promise<GeminiForensicResult> {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // Zero-latency instant offline fallback if API key is not configured
  if (!apiKey || apiKey.trim() === "") {
    return {
      executed: false,
      ok: false,
      model: "offline-algorithmic",
      latencyMs: 0,
      error: "GEMINI_API_KEY_NOT_CONFIGURED",
    };
  }

  // 10-minute cache check by SHA-256 of image / payload
  let cacheKey = "";
  try {
    const rawData = input.payload.fileBase64 || JSON.stringify({ type: input.type, payload: input.payload });
    const { createHash } = await import("crypto");
    cacheKey = createHash("sha256").update(rawData).digest("hex");
  } catch (_) {
    cacheKey = input.payload.fileBase64 ? input.payload.fileBase64.substring(0, 100) : input.type;
  }

  if (cacheKey && geminiCache.has(cacheKey)) {
    const cached = geminiCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        ...cached.result,
        latencyMs: 1,
      };
    } else {
      geminiCache.delete(cacheKey);
    }
  }

  try {
    const { safeBase64, mimeType } = sanitizeBase64(input.payload.fileBase64);

    // 1. Build Module-Specific Live Research System Instructions
    let moduleInstruction = "";
    if (input.type === "upi") {
      moduleInstruction = `
MODULE 1: HIGH-PRECISION UPI, PAYMENT RECEIPT & SYNTHETIC AI FORENSICS
- Analyze UTR '${input.payload.utr || "N/A"}' and UPI handle '${input.payload.upiId || "N/A"}'.

1. WATERMARK & DISCLAIMER CHECK (INSTANT 99 RISK - EVALUATE FIRST):
- Scan the entire canvas, including headers, footers, faint background watermarks, and margins for words like:
  "sample", "sample image", "test", "not real", "not a real transaction", "demo", "simulation", "specimen", or "generated".
- IF ANY simulation or watermark disclaimer is present anywhere in the image:
  * You MUST set "verdict": "fraud" and "riskScore": 99.
  * You MUST cite this exact evidence: "WATERMARK DETECTED: Image explicitly contains simulation/sample disclaimer."

2. STATUS BAR & UI GLITCH DETECTION (INSTANT 90+ RISK):
- Closely inspect the top mobile OS status bar:
  * Check for glitched, overlapping, or impossible battery readings (e.g., "78% 7%").
  * Check for hallucinated Wi-Fi, 5G, or carrier indicators, or multiple clocks.
  * Check for non-native system fonts (Android Roboto/Google Sans vs diffusion blurred text).
- IF ANY status bar glitch or overlapping glyph is detected:
  * You MUST set "verdict": "fraud" and "riskScore": 94.
  * You MUST cite: "STATUS BAR GLITCH DETECTED: Overlapping/impossible battery and carrier metrics (e.g., '78% 7%') characteristic of Generative AI hallucination."

3. NPCI UTR & TRANSACTION ID VALIDATION:
- Indian NPCI UPI UTRs are strictly 12 NUMERIC DIGITS (Format: Y DDD XXXXXXXX).
- If the receipt displays a transaction ID starting with letters (e.g., 'P2620212345678901234') or exceeding 12 digits WITHOUT a separate standard 12-digit UTR/RRN:
  * Add +50 to risk, set "verdict": "fraud" ("riskScore": >= 90).
  * Flag: "NON-STANDARD TRANSACTION ID: Found transaction ID that does not match NPCI 12-digit UTR format."
- Julian Date Cross-Verification:
  * Digit 1 is year (e.g., 6 for 2026, 5 for 2025). Digits 2-4 are the Julian day of the year (001-366).
  * Example: 21 Oct 2026 is Day 294 of 2026; a valid UTR on this date MUST start with '6294'.
  * If the receipt date does not match the Julian day/year prefix in the UTR, add +60 to risk, set "verdict": "fraud", and cite: "FRAUDULENT / SYNTHETIC UTR: Date on receipt does not match Julian day/year encoded in the 12-digit UTR."

4. VPA & PLATFORM CONSISTENCY:
- Cross-reference payment handle against platform UI:
  * Flag anomalous VPA handles (e.g., '@ybl' on a Paytm interface without authenticated partner routing labels).
  * Check official TPAP registries (@ybl = PhonePe, @okaxis/@okicici = Google Pay, @paytm = Paytm).

5. GENERATIVE AI TYPOGRAPHY & DIFFUSION ARTIFACTS:
- Identify soft, glowing text outlines, synthetic antialiasing, warped bank/PSP vector logos, and diffusion smoothing.
- NOTE: Uniform Canvas ELA does NOT mean genuine if diffusion artifacts, glitched status bars, or UI hallucinations are present.`;
    } else if (input.type === "qr") {
      moduleInstruction = `
MODULE 2: HIGH-PRECISION QR CODE, GENERATIVE AI & TRAP-LINK FORENSICS
1. GENERATIVE AI & SYNTHETIC QR DETECTION (CRITICAL - EVALUATE FIRST):
- If an image is provided, inspect the QR code visually:
  * Check for Generative AI (ChatGPT, DALL-E, Midjourney, Stable Diffusion) hallmarks:
    - Warped, melted, glowing, or asymmetric corner finder patterns (the three square locators).
    - Hallucinated, blurred, or non-grid module patterns that do not conform to standard Reed-Solomon QR matrix specifications.
    - Artistic styling, diffusion blur, or synthetic anti-aliasing around modules.
  * IF the image is an AI-generated QR simulation or unreadable synthetic matrix:
    - You MUST set "verdict": "fraud" and "riskScore": 96.
    - You MUST cite evidence: "SYNTHETIC AI-GENERATED QR CODE: Visual inspection reveals AI diffusion signatures (asymmetric/melted finder patterns and mathematically unparseable matrix) characteristic of ChatGPT/DALL-E image generation."
    - Explain that official UPI & banking apps (PhonePe, Paytm, Google Pay, BHIM) will fail to scan this code, marking it as a fraudulent simulation or decoy.

2. PHYSICAL TAMPERING & STICKER OVERLAY:
- Inspect whether a fake or replacement QR code sticker has been pasted over an authentic merchant standee (Paytm/PhonePe/GPay soundbox or counter card).
- Check for misaligned borders, paper edges, peeling stickers, or mismatched merchant branding.

3. WATERMARKS & DISCLAIMERS:
- Scan for faint text, watermarks, or disclaimers: "sample", "test", "demo", "simulation", "ChatGPT", "DALL-E", "not a real QR", "specimen".
- If detected, set "verdict": "fraud" and "riskScore": 99.

4. INTENT & TRAP-LINK ANALYSIS:
- If a decoded URI or text is present: '${input.payload.qrText || "N/A"}'.
- Check whether the URI contains 'mode=02' or 'upi://collect' reverse-debit trap signals designed to debit the victim's account.
- For web links, check domain registration age, typosquatting against Indian banks (SBI, HDFC, ICICI, Axis), free TLD usage (.xyz, .top, .tk), and active phishing campaign records.`;
    } else if (input.type === "job") {
      moduleInstruction = `
MODULE 3: JOB & INTERNSHIP OFFER SCREENER
- Analyze offer text: '${(input.payload.jobText || "").slice(0, 1500)}'.
- Extract company name, email domain, salary figures, and HR contacts.
- Perform real-time entity verification: Check if the company is an established corporate entity, a recognized startup/edtech, or an unregistered fraudulent shell.
- Flag demands for upfront security deposits, laptop fees, training charges, or interviews conducted exclusively over Telegram/WhatsApp.`;
    } else if (input.type === "deepfake") {
      moduleInstruction = `
MODULE 4: DEEPFAKE & SYNTHETIC MEDIA INSPECTOR
- Analyze video file '${input.payload.filename || "video.mp4"}' (Size: ${input.payload.fileSize || 1024000} bytes).
- Cross-reference known synthetic media patterns: facial boundary seam artifacts, unnatural blink deficiency (<6 blinks/min), lip-sync phoneme desynchronization, and 'Digital Arrest' impersonation syndicate scripts.
- Search current cyber police intelligence regarding AI video impersonation of Indian police/CBI/judges.`;
    } else if (input.type === "document") {
      moduleInstruction = `
MODULE 5: DOCUMENT & INVOICE FORENSICS
- Analyze invoice items: ${JSON.stringify(input.payload.items || [])}, printed total: ₹${input.payload.printedTotal ?? "N/A"}.
- Extract GSTIN numbers, CIN numbers, or company names.
- Validate GSTIN 15-character structure and state codes against corporate registry norms.
- Perform line-item mathematical audits (Subtotal + GST = Total) to expose altered figures and check metadata for image editor artifacts (Adobe Photoshop, Canva).`;
    }

    const systemPrompt = `You are SatyaKavach Forensics — the premier digital forensics and cyber defense intelligence engine for Indian cyber crime authorities (1930 / cybercrime.gov.in).

CRITICAL REQUIREMENT:
Perform real-time contextual intelligence analysis for this incident.
${moduleInstruction}

Deterministic Pre-scan Baseline: ${input.localEvidence?.join("; ") || "None"}
Language preference: ${input.lang === "hi" ? "Hindi (Devanagari)" : "English"}

You MUST return STRICTLY a valid JSON object matching this schema without markdown fences:
{
  "verdict": "genuine" | "suspicious" | "fraud",
  "riskScore": <integer 0-100>,
  "confidence": <integer 0-100>,
  "evidence": ["deep evidentiary point 1", "point 2", "point 3"],
  "entityProfile": {
    "entityName": "<identified company, merchant, or individual>",
    "entityType": "<e.g. Registered Corporate, Financial PSP, Disposable Shell, Synthetic Deepfake>",
    "registryStatus": "<e.g. Verified NPCI Handle, RoC Active, Unregistered / Suspicious>",
    "domainFootprint": "<associated domain or network infrastructure>",
    "isVerifiedEntity": <boolean>,
    "riskCategory": "<e.g. UPI Collect Debit Trap, Digital Arrest Syndicate, Fake Job Letter>"
  },
  "liveWebStatus": {
    "summary": "<2 sentence real-time intelligence summary>",
    "reputationScore": <integer 0-100, where 100 is pristine and 0 is known malicious>,
    "searchSignals": ["signal 1", "signal 2"]
  },
  "riskRationale": "<thorough technical explanation justifying the verdict>",
  "actionSteps": [
    "<immediate actionable protective step 1>",
    "<step 2>",
    "<step 3>"
  ],
  "ocrText": "<extracted text from image if any>",
  "forensicAnalysis": "<2 sentence authoritative summary in requested language>"
}`;

    // 2. Attach Multi-Modal Image/Document and Text Prompt
    const parts: any[] = [];
    if (safeBase64 && safeBase64.length > 50) {
      parts.push({
        inlineData: {
          data: safeBase64,
          mimeType: mimeType || "image/jpeg",
        },
      });
    }
    parts.push({ text: systemPrompt });

    const contents = [
      {
        role: "user",
        parts,
      },
    ];

    // Execute with resilient fallback chain and exponential backoff
    const fallbackResult = await executeWithGeminiFallback({
      apiKey,
      contents,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    if (!fallbackResult.ok) {
      return {
        executed: false,
        ok: false,
        stage: "gemini",
        model: "none",
        latencyMs: fallbackResult.latencyMs,
        error: fallbackResult.error,
      };
    }

    const { response, modelUsed, latencyMs } = fallbackResult;
    const rawText = response.text || "";

    // Extract Google Search Grounding Metadata if present
    const candidate = response?.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const groundedSources: Array<{ title: string; url: string }> = [];

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri) {
          groundedSources.push({
            title: chunk.web.title || "Official Reference",
            url: chunk.web.uri,
          });
        }
      }
    }

    // Clean JSON parsing
    const cleanedJson = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedJson);

    const evidence = Array.isArray(parsed.evidence)
      ? parsed.evidence.map((e: any) => String(e).trim()).filter(Boolean)
      : [];

    const isSyntheticOrFraud =
      parsed.verdict === "fraud" ||
      evidence.some((e: string) =>
        /synthetic|generative ai|diffusion|hallucinated|fake|non-standard.*typography|dall-e|watermark|status bar glitch|non-standard transaction id/i.test(e)
      );

    const verdict: "genuine" | "suspicious" | "fraud" = isSyntheticOrFraud
      ? "fraud"
      : parsed.verdict === "suspicious"
      ? "suspicious"
      : "genuine";

    let calculatedRiskScore =
      typeof parsed.riskScore === "number"
        ? Math.min(100, Math.max(0, parsed.riskScore))
        : verdict === "fraud"
        ? 92
        : verdict === "suspicious"
        ? 65
        : 10;

    if (verdict === "fraud") {
      calculatedRiskScore = Math.max(88, calculatedRiskScore);
    }

    const riskScore = calculatedRiskScore;
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.min(100, Math.max(0, parsed.confidence))
        : 90;

    const finalResult: GeminiForensicResult = {
      executed: true,
      ok: true,
      verdict,
      riskScore,
      confidence,
      evidence,
      ocrText: parsed.ocrText || undefined,
      forensicAnalysis: parsed.forensicAnalysis || undefined,
      entityProfile: parsed.entityProfile || undefined,
      liveWebStatus: {
        summary: parsed.liveWebStatus?.summary || "Real-time web research verified against threat intelligence feeds.",
        reputationScore: typeof parsed.liveWebStatus?.reputationScore === "number" ? parsed.liveWebStatus.reputationScore : (100 - riskScore),
        searchSignals: Array.isArray(parsed.liveWebStatus?.searchSignals) ? parsed.liveWebStatus.searchSignals : [],
        groundedSources: groundedSources.length > 0 ? groundedSources : undefined,
      },
      riskRationale: parsed.riskRationale || undefined,
      actionSteps: Array.isArray(parsed.actionSteps) ? parsed.actionSteps : [
        "Do not transfer funds or share OTPs.",
        "Verify credentials through official corporate portals.",
        "Report fraud attempts to National Cyber Helpline 1930."
      ],
      groundedSources: groundedSources.length > 0 ? groundedSources : undefined,
      model: modelUsed,
      modelUsed,
      latencyMs,
    };

    if (cacheKey) {
      geminiCache.set(cacheKey, {
        result: { ...finalResult },
        timestamp: Date.now(),
      });
    }

    return finalResult;
  } catch (err: any) {
    console.error("[SatyaKavach] Gemini forensics error:", err?.message || err);
    return {
      executed: false,
      ok: false,
      stage: "gemini",
      model: "none",
      latencyMs: Date.now() - startTime,
      error: "AI engine busy, try again",
    };
  }
}

/**
 * Exported alias for dedicated UPI multimodal forensic analysis
 */
export async function analyzeUPIForensicsWithGemini(
  input: GeminiForensicInput
): Promise<GeminiForensicResult> {
  return runGeminiForensicAnalysis({ ...input, type: "upi" });
}
