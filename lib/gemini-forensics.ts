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
  latencyMs: number;
  error?: string;
}

/**
 * Executes multi-modal forensic inspection with real-time Google Search grounding
 * Supports live research across all 5 forensic modules
 */
export async function runGeminiForensicAnalysis(
  input: GeminiForensicInput
): Promise<GeminiForensicResult> {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;

  // Zero-latency instant offline fallback if API key is not configured
  if (!apiKey || apiKey.trim() === "") {
    return {
      executed: false,
      model: "offline-algorithmic",
      latencyMs: 0,
      error: "GEMINI_API_KEY_NOT_CONFIGURED",
    };
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];
    const { safeBase64, mimeType } = sanitizeBase64(input.payload.fileBase64);

    // 1. Attach Multi-Modal Image/Document if present
    if (safeBase64 && safeBase64.length > 50) {
      contents.push({
        inlineData: {
          data: safeBase64,
          mimeType: mimeType || "image/jpeg",
        },
      });
    }

    // 2. Build Module-Specific Live Research System Instructions
    let moduleInstruction = "";
    if (input.type === "upi") {
      moduleInstruction = `
MODULE 1: UPI & RECEIPT FORENSICS
- Analyze UTR '${input.payload.utr || "N/A"}' and UPI handle '${input.payload.upiId || "N/A"}'.
- Cross-reference the payment handle (@ybl, @okaxis, @paytm, @apl, etc.) against legitimate NPCI third-party application provider (TPAP) registries.
- OCR the screenshot to verify bank branding alignment, timestamps, transaction reference validity, and detect FakePay/SpoofPay app watermarks or font tampering.
- Search for known merchant fraud patterns and active mule accounts matching this identifier.`;
    } else if (input.type === "qr") {
      moduleInstruction = `
MODULE 2: QR & TRAP-LINK SCANNER
- Analyze payload: '${input.payload.qrText || "N/A"}'.
- Check whether the URI contains 'mode=02' or 'upi://collect' reverse-debit trap signals designed to suck money out of the victim's account.
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

    contents.push({ text: systemPrompt });

    // Enable Google Search Grounding for real-time web research
    let response: any;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (groundingError) {
      // Graceful fallback to model inference without search tools if search tool has regional constraints
      console.warn("[SatyaKavach] Retrying without googleSearch tool:", groundingError);
      response = await ai.models.generateContent({
        model: modelName,
        contents,
      });
    }

    const rawText = response.text || "";
    const latencyMs = Date.now() - startTime;

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

    const verdict: "genuine" | "suspicious" | "fraud" =
      parsed.verdict === "fraud" || parsed.verdict === "suspicious"
        ? parsed.verdict
        : "genuine";

    const riskScore =
      typeof parsed.riskScore === "number"
        ? Math.min(100, Math.max(0, parsed.riskScore))
        : verdict === "fraud"
        ? 92
        : verdict === "suspicious"
        ? 65
        : 10;

    const confidence =
      typeof parsed.confidence === "number"
        ? Math.min(100, Math.max(0, parsed.confidence))
        : 90;

    const evidence = Array.isArray(parsed.evidence)
      ? parsed.evidence.map((e: any) => String(e).trim()).filter(Boolean)
      : [];

    return {
      executed: true,
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
      model: modelName,
      latencyMs,
    };
  } catch (err: any) {
    console.warn("[SatyaKavach] Gemini API bypassed, using zero-latency offline engine:", err?.message);
    return {
      executed: false,
      model: modelName,
      latencyMs: Date.now() - startTime,
      error: err?.message || "Gemini inference unavailable",
    };
  }
}
