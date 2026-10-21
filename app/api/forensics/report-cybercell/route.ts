import { NextRequest, NextResponse } from "next/server";
import { withApiGuard, sanitizeString } from "@/lib/api-guard";
import { checkRateLimit } from "@/lib/telemetry";

export interface CyberCellComplaintRequest {
  analysis: {
    module: "upi" | "qr" | "job" | "deepfake" | "document";
    verdict: "genuine" | "suspicious" | "fraud";
    riskScore: number;
    evidence: string[];
    sha256?: string;
  };
  incident?: {
    suspectUpi?: string;
    suspectPhone?: string;
    suspectWebsite?: string;
    disputedAmount?: number;
    transactionDate?: string;
    incidentDescription?: string;
    victimCityState?: string;
  };
}

export interface CyberCellComplaintPayload {
  acknowledgementCode: string;
  portalSubmissionTarget: {
    officialPortal: "https://cybercrime.gov.in";
    tollFreeHelpline: "1930";
    systemName: "Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS)";
  };
  crimeCategory: string;
  suspectEntity: {
    vpaOrUpiId: string;
    contactNumber: string;
    websiteOrDomain: string;
  };
  formalPoliceNarrative: string;
  evidentiaryAnnexures: {
    sha256Hash: string;
    identifiedRedFlags: string[];
    algorithmicRiskScore: number;
  };
  goldenHourAdvisory: string[];
  generatedAtIST: string;
}

export const POST = withApiGuard<CyberCellComplaintRequest>(
  async (req: NextRequest, body: CyberCellComplaintRequest, clientIp: string) => {
    // 1. Rate Limiter (30 complaint formatting calls / min per IP)
    const rateLimit = checkRateLimit(`report-cybercell:${clientIp}`, 30, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          code: "TOO_MANY_REQUESTS",
          details: `Retry in ${rateLimit.resetInSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const { analysis, incident = {} } = body;

    if (!analysis) {
      return NextResponse.json(
        {
          error: "Missing analysis data",
          code: "INVALID_REQUEST",
          details: "Forensic analysis results are required to generate a complaint dossier.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const istTime =
      now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";

    // Map module to official I4C Crime Classification
    let crimeCategory = "Online Financial Fraud / UPI Payment Scam";
    if (analysis.module === "job") {
      crimeCategory = "Employment Fraud / Fake Job Offer Syndicate";
    } else if (analysis.module === "deepfake") {
      crimeCategory = "AI Impersonation / Digital Arrest & Extortion Syndicate";
    } else if (analysis.module === "qr") {
      crimeCategory = "Malicious UPI Collect Request / Phishing QR Fraud";
    } else if (analysis.module === "document") {
      crimeCategory = "Document Forgery / Altered Financial Records";
    }

    const suspectVpa = sanitizeString(incident.suspectUpi || "N/A");
    const suspectPhone = sanitizeString(incident.suspectPhone || "N/A");
    const suspectWeb = sanitizeString(incident.suspectWebsite || "N/A");
    const amountStr = incident.disputedAmount ? `₹${incident.disputedAmount.toLocaleString("en-IN")}` : "Unspecified / Attempted";

    // Build formal complaint narrative
    const policeNarrative = `FORMAL COMPLAINT DRAFT FOR NATIONAL CYBER CRIME REPORTING PORTAL (cybercrime.gov.in)
-------------------------------------------------------------------------------------------------------
Subject: Complaint regarding ${crimeCategory} involving monetary loss / attempted fraud of ${amountStr}.

Respected Cyber Crime Officer,

I wish to register a formal complaint regarding a cyber fraud incident detected and analyzed via the SatyaKavach digital forensics runtime.

1. SUSPECT IDENTIFIERS:
   - Suspect UPI / VPA: ${suspectVpa}
   - Suspect Mobile / WhatsApp: ${suspectPhone}
   - Suspect Link / Platform: ${suspectWeb}

2. INCIDENT CHRONOLOGY:
   ${sanitizeString(incident.incidentDescription || "The victim was targeted using manipulated digital artifacts designed to impersonate legitimate entities and solicit unauthorized fund transfers.")}

3. TECHNICAL FORENSIC EVIDENCE:
   - Forensic Analysis Verdict: ${analysis.verdict.toUpperCase()} (Risk Score: ${analysis.riskScore}/100)
   - Cryptographic Evidence SHA-256 Digest: ${analysis.sha256 || "Available in raw attachment"}
   - Forensic Flags Identified:
     * ${analysis.evidence.join("\n     * ")}

4. PRAYER FOR RELIEF:
   Kindly register this under relevant sections of the Information Technology Act (Sec 66C/66D) and Bharatiya Nyaya Sanhita (BNS 318/319), issue immediate lien instructions on the recipient account via 1930 CFCFRMS, and take lawful action.`;

    const ackCode = `I4C-SK-${now.getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;

    const responsePayload: CyberCellComplaintPayload = {
      acknowledgementCode: ackCode,
      portalSubmissionTarget: {
        officialPortal: "https://cybercrime.gov.in",
        tollFreeHelpline: "1930",
        systemName:
          "Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS)",
      },
      crimeCategory,
      suspectEntity: {
        vpaOrUpiId: suspectVpa,
        contactNumber: suspectPhone,
        websiteOrDomain: suspectWeb,
      },
      formalPoliceNarrative: policeNarrative,
      evidentiaryAnnexures: {
        sha256Hash: analysis.sha256 || "N/A",
        identifiedRedFlags: analysis.evidence,
        algorithmicRiskScore: analysis.riskScore,
      },
      goldenHourAdvisory: [
        "Dial 1930 IMMEDIATELY: Reporting within the first 2 hours triggers bank-level temporary holds on suspect accounts.",
        "Submit this exact text at https://cybercrime.gov.in under 'Report Financial Fraud'.",
        "Inform your bank's nodal fraud manager with the dispute transaction UTR.",
        "Preserve this JSON report and screenshot attachments as court-admissible evidence under Section 65B.",
      ],
      generatedAtIST: istTime,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  }
);
