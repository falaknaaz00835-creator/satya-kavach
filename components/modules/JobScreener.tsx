"use client";

import { useState, useRef, useCallback } from "react";
import clsx from "clsx";
import {
  BriefcaseBusiness,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  RefreshCcw,
  Download,
  ChevronDown,
  ChevronUp,
  Zap,
  Search,
  Building2,
  IndianRupee,
  Mail,
  Hash,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Info,
} from "lucide-react";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
type RiskLevel = "safe" | "suspicious" | "fraud";

interface RedFlag {
  category: "fee" | "domain" | "registration" | "salary" | "language" | "contact";
  label: string;
  detail: string;
  matchedText?: string;
  severity: "high" | "medium" | "low";
}

interface GreenSignal {
  label: string;
  detail: string;
}

interface ScreenResult {
  riskLevel: RiskLevel;
  riskScore: number;        // 0-100
  confidence: number;
  redFlags: RedFlag[];
  greenSignals: GreenSignal[];
  extractedEntities: {
    companyName?: string;
    emailDomain?: string;
    cinNumber?: string;
    gstNumber?: string;
    salary?: string;
    joiningFee?: string;
    contactPhone?: string;
  };
  timestamp: string;
}

/* ─────────────────────────────────────────
   Intelligence: Upfront Fee Patterns
   Covers English + Hindi-English hybrids
───────────────────────────────────────── */
const FEE_PATTERNS: Array<{ pattern: RegExp; label: string; severity: "high" | "medium" }> = [
  { pattern: /security\s+deposit/gi,              label: "Security Deposit Demand",    severity: "high" },
  { pattern: /laptop\s*(fee|charge|cost)/gi,       label: "Laptop Fee Demand",           severity: "high" },
  { pattern: /training\s*(fee|charge|cost)/gi,     label: "Training Fee Demand",         severity: "high" },
  { pattern: /registration\s*(fee|charge|amount)/gi, label: "Registration Fee Demand",  severity: "high" },
  { pattern: /joining\s*(fee|charge|amount|kit)/gi,  label: "Joining Fee / Kit Demand", severity: "high" },
  { pattern: /processing\s*(fee|charge)/gi,        label: "Processing Fee Demand",       severity: "high" },
  { pattern: /background\s+verification\s*(fee|charge|cost)/gi, label: "BGV Fee Demand", severity: "high" },
  { pattern: /uniform\s*(fee|deposit|charge)/gi,   label: "Uniform Fee Demand",          severity: "high" },
  { pattern: /refundable\s+deposit/gi,             label: "\"Refundable\" Deposit Demand", severity: "high" },
  { pattern: /id\s*card\s*(fee|charge|cost)/gi,    label: "ID Card Fee Demand",          severity: "high" },
  { pattern: /kit\s+(fee|amount|deposit)/gi,       label: "Starter Kit Fee",             severity: "high" },
  { pattern: /courier\s*(charge|fee|cost)/gi,      label: "Courier Charge for Offer Letter", severity: "medium" },
  { pattern: /advance\s+(salary|payment|deposit)/gi, label: "Advance Payment Demand",   severity: "medium" },
  { pattern: /pay\s+(before|within|prior to)\s+(joining|start)/gi, label: "Pre-Joining Payment Demand", severity: "high" },
  { pattern: /transfer\s+₹?\s*\d+/gi,             label: "Direct Transfer Amount Mentioned", severity: "medium" },
  { pattern: /paytm|phonepe|gpay|upi.*id.*send/gi, label: "Payment via Personal UPI Mentioned", severity: "high" },
  { pattern: /google\s*pay.*\d{10}/gi,             label: "Personal Phone UPI for Payment", severity: "high" },
];

/* ─────────────────────────────────────────
   Intelligence: Legitimate corporate domains
   Real companies NEVER use these patterns
───────────────────────────────────────── */
const LEGIT_CORP_DOMAINS = new Set([
  "tcs.com", "infosys.com", "wipro.com", "hcltech.com",
  "accenture.com", "cognizant.com", "capgemini.com",
  "ibm.com", "oracle.com", "microsoft.com", "google.com",
  "amazon.com", "flipkart.com", "zomato.com", "swiggy.in",
  "ola.com", "razorpay.com", "freshworks.com", "zoho.com",
  "byju.com", "unacademy.com", "phonepe.com", "paytm.com",
  "hdfc.com", "icicibank.com", "axisbank.com", "sbi.co.in",
  "mindtree.com", "mphasis.com", "hexaware.com", "ltimindtree.com",
  "deloitte.com", "pwc.com", "kpmg.com", "ey.com",
  "ril.com", "tatamotors.com", "mahindra.com", "bajaj.com",
]);

// Suspicious patterns in email domains used by fake recruiters
const FAKE_DOMAIN_PATTERNS: Array<{ pattern: RegExp; mimics: string; severity: "high" | "medium" }> = [
  { pattern: /tcs[-_.]?(careers?|hr|recruit|job|hiring)/i, mimics: "TCS (tcs.com)", severity: "high" },
  { pattern: /infosys[-_.]?(careers?|hr|recruit|bpo)/i,    mimics: "Infosys (infosys.com)", severity: "high" },
  { pattern: /wipro[-_.]?(careers?|hr|jobs?|global)/i,     mimics: "Wipro (wipro.com)", severity: "high" },
  { pattern: /hcl[-_.]?(careers?|hr|tech|jobs?)/i,         mimics: "HCLTech (hcltech.com)", severity: "high" },
  { pattern: /accenture[-_.]?(careers?|hr|global)/i,       mimics: "Accenture", severity: "high" },
  { pattern: /cognizant[-_.]?(careers?|hr|jobs?)/i,        mimics: "Cognizant", severity: "high" },
  { pattern: /amazon[-_.]?(careers?|hr|jobs?|hiring)/i,    mimics: "Amazon", severity: "high" },
  { pattern: /google[-_.]?(careers?|hr|jobs?)/i,           mimics: "Google", severity: "high" },
  { pattern: /flipkart[-_.]?(careers?|hr|jobs?)/i,         mimics: "Flipkart", severity: "high" },
  { pattern: /deloitte[-_.]?(careers?|hr|india)/i,         mimics: "Deloitte", severity: "high" },
  { pattern: /\b(gmail|yahoo|rediff|hotmail|outlook)\.(com|in)\b/i, mimics: "Professional corporate email", severity: "high" },
  { pattern: /hr[-_.]?(india|team|dept|support|global)\.(com|net|in|org)/i, mimics: "Generic HR domain spoof", severity: "medium" },
  { pattern: /recruit(ment)?[-_.]?(india|hub|pro|team)\.(com|net|in|org)/i, mimics: "Fake recruitment portal", severity: "medium" },
  { pattern: /jobs?[-_.]?(india|portal|hub)\.(com|net|xyz)/i, mimics: "Fake job portal", severity: "medium" },
];

/* ─────────────────────────────────────────
   CIN Validator (Companies Act 2013)
   Format: [L|U][5-digit NIC][State][Category][4-digit Year][6-digit Seq]
   Example: L17110MH1973PLC019786
───────────────────────────────────────── */
const INDIAN_STATES = new Set([
  "AN","AP","AR","AS","BR","CH","CT","DD","DL","DN","GA","GJ","HP","HR",
  "JH","JK","KA","KL","LA","LD","MH","ML","MN","MP","MZ","NL","OR","PB",
  "PY","RJ","SK","TG","TN","TR","UP","UT","WB",
]);

function validateCIN(cin: string): { valid: boolean; reason?: string } {
  const cleaned = cin.replace(/\s/g, "").toUpperCase();
  if (!/^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(cleaned)) {
    return { valid: false, reason: "Format invalid — expected L/U + 5 digits + 2-letter state + 4-digit year + 3-letter category + 6 digits (e.g. L17110MH1973PLC019786)" };
  }
  const stateCode = cleaned.substring(6, 8);
  if (!INDIAN_STATES.has(stateCode)) {
    return { valid: false, reason: `State code '${stateCode}' is not a valid Indian state/UT code` };
  }
  const year = parseInt(cleaned.substring(8, 12));
  if (year < 1857 || year > new Date().getFullYear()) {
    return { valid: false, reason: `Incorporation year ${year} is outside valid range (1857–present)` };
  }
  return { valid: true };
}

/* GST Validator: 15-char, starts with 2-digit state code */
function validateGST(gst: string): { valid: boolean; reason?: string } {
  const cleaned = gst.replace(/\s/g, "").toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(cleaned)) {
    return { valid: false, reason: "Format invalid — expected 15 characters: 2-digit state + 10-char PAN + 1 entity + Z + 1 check" };
  }
  return { valid: true };
}

/* ─────────────────────────────────────────
   Language Red-Flag Patterns
   (desperation tactics, vague role, etc.)
───────────────────────────────────────── */
const LANGUAGE_PATTERNS: Array<{ pattern: RegExp; label: string; severity: "high" | "medium" | "low" }> = [
  { pattern: /urgent(ly)?\s+(hiring|requirement|opening|vacancy)/gi, label: "Urgency Pressure Tactic", severity: "medium" },
  { pattern: /work\s+from\s+home.{0,30}(guaranteed|assured|daily|weekly)\s+(income|earning|salary)/gi, label: "Guaranteed WFH Income Claim", severity: "high" },
  { pattern: /part[- ]time.{0,30}(₹|rs\.?|inr).{0,10}\d+(,\d{3})*\s*(per\s*(day|hour|week))/gi, label: "Unrealistic Part-Time Income Promise", severity: "high" },
  { pattern: /no\s+(experience|qualification|degree)\s+(required|needed)/gi, label: "No-Qualification Bait", severity: "medium" },
  { pattern: /earn\s+(upto?|up\s+to|₹|rs).{0,15}\d{4,}/gi, label: "Unverified Earning Claim", severity: "medium" },
  { pattern: /limited\s+(seats?|positions?|openings?|slots?)/gi, label: "Artificial Scarcity Tactic", severity: "low" },
  { pattern: /do\s+not\s+(share|tell|disclose).{0,30}(others?|anyone)/gi, label: "Secrecy Demand", severity: "high" },
  { pattern: /whatsapp.{0,20}(immediately|urgently|asap|now)/gi, label: "WhatsApp-Only Contact (No Official Channel)", severity: "medium" },
  { pattern: /direct\s+interview\s*(on|via|through)?\s*(whatsapp|zoom|google\s*meet|video\s*call)/gi, label: "No In-Person / Official Interview", severity: "medium" },
  { pattern: /selected\s+(without\s+)?(any\s+)?interview/gi, label: "\"Selected Without Interview\" Red Flag", severity: "high" },
];

/* ─────────────────────────────────────────
   Salary Anomaly Detector
───────────────────────────────────────── */
function detectSalaryAnomaly(text: string): RedFlag | null {
  // Extract all salary figures
  const salaryMatches = text.matchAll(/(?:ctc|salary|stipend|package|lpa|per\s*annum|per\s*month)[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(lpa|lakh|l\.?p\.?a|per\s*annum|per\s*month|pm|\/month|\/year)?/gi);

  for (const match of salaryMatches) {
    const raw = match[1].replace(/,/g, "");
    const amount = parseFloat(raw);
    const unit = (match[2] || "").toLowerCase();

    // Monthly salary > ₹5L for fresher internship is suspicious
    if (unit.includes("month") || unit.includes("pm")) {
      if (amount > 500000) {
        return {
          category: "salary", severity: "high",
          label: `Unrealistic Monthly Salary: ₹${amount.toLocaleString("en-IN")}`,
          detail: "A monthly salary exceeding ₹5,00,000 for an entry-level/internship offer is statistically implausible and a common bait figure in fake offers.",
          matchedText: match[0],
        };
      }
    }

    // LPA > 50 for fresher is suspicious
    if (unit.includes("lpa") || unit.includes("lakh") || unit.includes("annum")) {
      if (amount > 50) {
        return {
          category: "salary", severity: "high",
          label: `Unrealistic Annual CTC: ₹${amount} LPA`,
          detail: `A fresher CTC of ₹${amount} LPA far exceeds the 99th percentile of legitimate Indian campus placements (₹40–50 LPA at IITs). This is likely a fabricated figure.`,
          matchedText: match[0],
        };
      }
    }

    // Suspiciously round stipend (₹5000, ₹10000) with "daily"
    if ((unit.includes("day") || text.toLowerCase().includes("daily")) && amount >= 2000) {
      return {
        category: "salary", severity: "high",
        label: `Unrealistic Daily Income Promise: ₹${amount}/day`,
        detail: "Daily income promises of ₹2,000+ for data-entry or part-time work are a signature of fake job and task-based scam offers.",
        matchedText: match[0],
      };
    }
  }
  return null;
}

/* ─────────────────────────────────────────
   Entity extraction helpers
───────────────────────────────────────── */
function extractEntities(text: string) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const cinMatch   = text.match(/\b[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/i);
  const gstMatch   = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b/i);
  const salaryMatch = text.match(/(?:ctc|salary|stipend|package)[:\s]*(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:lpa|lakh|per\s*month|pm)?/i);
  const feeMatch   = text.match(/(?:pay|transfer|deposit|send)\s*(?:₹|rs\.?)?\s*[\d,]+/i);
  const phoneMatch = text.match(/\b(?:\+91[-\s]?)?[6-9]\d{9}\b/);
  const companyMatch = text.match(/(?:company|organisation|firm|employer)[:\s]+([A-Z][A-Za-z\s&.]+(?:Ltd|Pvt|Inc|Corp|LLP|Technologies?|Solutions?|Services?)?)/i)
    || text.match(/^([A-Z][A-Za-z\s&.]+(?:Ltd|Pvt|Inc|Corp|LLP|Technologies?|Solutions?|Services?)\.?)/m);

  return {
    companyName: companyMatch?.[1]?.trim(),
    emailDomain: emailMatch ? emailMatch[1] : undefined,
    cinNumber: cinMatch?.[0],
    gstNumber: gstMatch?.[0],
    salary: salaryMatch?.[0]?.trim(),
    joiningFee: feeMatch?.[0]?.trim(),
    contactPhone: phoneMatch?.[0],
  };
}

/* ─────────────────────────────────────────
   Master screening engine
───────────────────────────────────────── */
function screenOfferLetter(text: string): ScreenResult {
  const redFlags: RedFlag[] = [];
  const greenSignals: GreenSignal[] = [];
  const entities = extractEntities(text);

  /* ── Fee demand scan ── */
  for (const { pattern, label, severity } of FEE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      redFlags.push({
        category: "fee", severity, label,
        detail: "Legitimate employers NEVER ask candidates to pay any fee before or after joining. Any request for money — even described as 'refundable' — is a scam signal.",
        matchedText: matches[0],
      });
    }
  }
  if (redFlags.filter(f => f.category === "fee").length === 0) {
    greenSignals.push({ label: "No upfront fee demand detected", detail: "No patterns for security deposit, training fee, laptop charge, registration fee, or joining kit payment were found." });
  }

  /* ── Email domain check ── */
  if (entities.emailDomain) {
    const domain = entities.emailDomain.toLowerCase();

    // Exact match on legit list
    if (LEGIT_CORP_DOMAINS.has(domain)) {
      greenSignals.push({ label: `Email domain @${domain} is a verified corporate domain`, detail: "The sender email domain matches the company's official registered domain." });
    }

    // Personal email services
    if (/^(gmail|yahoo|rediff|hotmail|outlook)\.(com|in)$/i.test(domain)) {
      redFlags.push({
        category: "domain", severity: "high",
        label: `Personal Email Used: @${domain}`,
        detail: "No legitimate company sends official offer letters from Gmail, Yahoo, Rediff, or Hotmail addresses. This is one of the strongest indicators of a fake offer.",
        matchedText: `@${domain}`,
      });
    } else {
      // Fake domain pattern check
      let matched = false;
      for (const { pattern, mimics, severity } of FAKE_DOMAIN_PATTERNS) {
        if (pattern.test(domain)) {
          redFlags.push({
            category: "domain", severity,
            label: `Fake Domain Impersonating ${mimics}`,
            detail: `The domain '@${domain}' mimics '${mimics}' by appending HR/careers/recruit keywords. The real company only sends from their official short domain. This is a phishing-style offer.`,
            matchedText: `@${domain}`,
          });
          matched = true;
          break;
        }
      }
      if (!matched && !LEGIT_CORP_DOMAINS.has(domain)) {
        // Unknown domain — mild warning
        redFlags.push({
          category: "domain", severity: "medium",
          label: `Unverified Email Domain: @${domain}`,
          detail: `The domain '@${domain}' was not found in the verified Indian corporate registry. Cross-check the company's official website to confirm this is their legitimate email domain.`,
          matchedText: `@${domain}`,
        });
      }
    }
  } else {
    redFlags.push({
      category: "domain", severity: "medium",
      label: "No Email Address Found in Document",
      detail: "A legitimate offer letter always includes an official company email for the HR/recruiter. Absence of an email contact is a red flag.",
    });
  }

  /* ── CIN validation ── */
  if (entities.cinNumber) {
    const cinResult = validateCIN(entities.cinNumber);
    if (cinResult.valid) {
      greenSignals.push({ label: `CIN ${entities.cinNumber} passes format validation`, detail: "The Company Identification Number follows the valid Companies Act format. Verify it at MCA21 portal (mca.gov.in) for full authentication." });
    } else {
      redFlags.push({
        category: "registration", severity: "high",
        label: `Invalid CIN: ${entities.cinNumber}`,
        detail: `CIN validation failed — ${cinResult.reason}. A fake or mistyped CIN is a strong indicator the company is not registered with the Ministry of Corporate Affairs.`,
        matchedText: entities.cinNumber,
      });
    }
  } else {
    redFlags.push({
      category: "registration", severity: "medium",
      label: "No CIN/GST Number Found",
      detail: "All registered Indian companies must display their CIN (Company Identification Number) on official letterheads. Its absence on an offer letter is suspicious.",
    });
  }

  if (entities.gstNumber) {
    const gstResult = validateGST(entities.gstNumber);
    if (gstResult.valid) {
      greenSignals.push({ label: `GST ${entities.gstNumber} passes format check`, detail: "The GSTIN format is valid. Cross-verify at the GST portal (gst.gov.in) for full authentication." });
    } else {
      redFlags.push({
        category: "registration", severity: "medium",
        label: `Invalid GSTIN Format: ${entities.gstNumber}`,
        detail: `GSTIN format check failed — ${gstResult.reason}. An incorrect GSTIN on company letterhead is a red flag.`,
        matchedText: entities.gstNumber,
      });
    }
  }

  /* ── Salary anomaly ── */
  const salaryFlag = detectSalaryAnomaly(text);
  if (salaryFlag) {
    redFlags.push(salaryFlag);
  } else if (entities.salary) {
    greenSignals.push({ label: "Salary figure is within realistic range", detail: "The mentioned compensation figure does not trigger anomaly thresholds for Indian fresher / internship market rates." });
  }

  /* ── Language red flags ── */
  for (const { pattern, label, severity } of LANGUAGE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      redFlags.push({
        category: "language", severity, label,
        detail: "This phrasing pattern is commonly used in fraudulent job offers to create urgency, bypass scrutiny, or extract money.",
        matchedText: matches[0],
      });
    }
  }

  /* ── Contact number check ── */
  if (entities.contactPhone) {
    // No specific flag, just note it for output
    greenSignals.push({ label: `Contact number ${entities.contactPhone} extracted`, detail: "Cross-verify this number against the company's official careers page or LinkedIn." });
  }

  /* ── Compute risk score ── */
  const highCount = redFlags.filter(f => f.severity === "high").length;
  const medCount  = redFlags.filter(f => f.severity === "medium").length;
  const lowCount  = redFlags.filter(f => f.severity === "low").length;
  const riskScore = Math.min(100, highCount * 22 + medCount * 10 + lowCount * 4);

  let riskLevel: RiskLevel = "safe";
  let confidence = 80;
  if (highCount >= 2) { riskLevel = "fraud";      confidence = Math.min(99, 80 + highCount * 5); }
  else if (highCount === 1 || medCount >= 2) { riskLevel = "suspicious"; confidence = 72 + medCount * 4; }
  else if (medCount >= 1 || lowCount >= 2)  { riskLevel = "suspicious"; confidence = 65; }

  if (redFlags.length === 0) {
    riskLevel = "safe";
    confidence = 78;
    greenSignals.push({ label: "No scam patterns detected", detail: "No upfront fee demands, no fake domains, and no suspicious language patterns found in this document." });
  }

  return {
    riskLevel, riskScore, confidence,
    redFlags, greenSignals,
    extractedEntities: entities,
    timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
  };
}

/* ─────────────────────────────────────────
   Preloaded sample cases
───────────────────────────────────────── */
type SampleCase = {
  id: string;
  label: string;
  labelHi: string;
  category: string;
  expectedRisk: RiskLevel;
  content: string;
};

const SAMPLES: SampleCase[] = [
  {
    id: "scam-fee",
    label: "Classic Fee Demand Scam",
    labelHi: "शुल्क मांग घोटाला",
    category: "Fee + Fake Domain",
    expectedRisk: "fraud",
    content: `OFFER LETTER — TCS CAREERS INDIA DIVISION

Dear Candidate,

Congratulations! You have been selected for the position of Software Trainee at TCS Career India Pvt Ltd.

Annual CTC: ₹4,20,000 LPA
Joining Date: Immediate

This is a work from home opportunity. Daily earning guaranteed: Rs. 3000 per day.

IMPORTANT: To confirm your appointment, you are required to pay a one-time refundable Security Deposit of ₹5,800 via PhonePe/GPay to UPI ID: hr.tcs2024@okaxis

Additionally, a Laptop Fee of ₹2,500 and Training Fee of ₹1,500 are to be paid before joining.

Contact HR immediately on WhatsApp: +91-9876543210
Email: hr-recruiter@tcs-careers-hr.com

Do not share this letter with others.

Selected without any further interview required.
Limited seats available — respond urgently.`,
  },
  {
    id: "scam-gmail",
    label: "Gmail HR Phishing Offer",
    labelHi: "Gmail HR फ़िशिंग ऑफर",
    category: "Personal Email + Urgency",
    expectedRisk: "fraud",
    content: `INTERNSHIP OFFER LETTER

From: infosys.hr.india2024@gmail.com

Dear Applicant,

You are selected for a 3-month internship at Infosys BPO Solutions.

Stipend: ₹25,000 per month
Work from home. No experience required.

URGENT: Seats are limited. Pay registration fee of ₹1,200 to confirm selection.
Payment to: 9999988888 (Google Pay)

Direct interview via Zoom — no in-person round needed.
Contact immediately on WhatsApp: +91-8888877777

Earn upto ₹15,000 per week working part-time.
Do not disclose this offer to anyone until you have joined.`,
  },
  {
    id: "scam-cin",
    label: "Fake CIN Registration",
    labelHi: "नकली CIN पंजीकरण",
    category: "Invalid CIN + Salary Bait",
    expectedRisk: "fraud",
    content: `APPOINTMENT LETTER

Company: Global Tech Innovations Pvt Ltd
CIN: X99999ZZ2023ABC000001
GST: 99AAAAA9999A1ZX

Dear Shortlisted Candidate,

We are pleased to offer you the position of Business Analyst.

CTC Package: 85 LPA (Eighty Five Lakhs Per Annum)
Joining: Within 7 working days

A processing fee of ₹3,000 and background verification fee of ₹1,500 must be transferred before your appointment is confirmed.

HR Contact: jobs-india-hub@recruitment-india.com
Phone: +91-7654321098

Urgent hiring — only 2 positions left.`,
  },
  {
    id: "legit-offer",
    label: "Legitimate Offer Letter",
    labelHi: "असली नियुक्ति पत्र",
    category: "Clean Offer",
    expectedRisk: "safe",
    content: `OFFER OF EMPLOYMENT

Razorpay Software Private Limited
CIN: U72200KA2013PTC097305
GSTIN: 29AAJCR1004H1ZG

Date: October 17, 2026

Dear Priya Sharma,

We are pleased to offer you the position of Software Development Engineer (SDE-I) at Razorpay.

Compensation:
- Fixed CTC: ₹14,00,000 per annum
- Variable: ₹1,50,000 per annum
- ESOPs: As per company policy

Start Date: November 3, 2026
Work Location: Bengaluru, Karnataka (Hybrid)

This offer is contingent on successful completion of background verification at no cost to you.

For queries, contact your recruiter:
Email: careers@razorpay.com
HR Business Partner: Amit Verma

This offer is subject to the terms in the attached employment agreement. No fees of any kind are charged to candidates at any stage of our hiring process.

Sincerely,
People Operations
Razorpay Software Private Limited`,
  },
];

/* ─────────────────────────────────────────
   Verdict badge
───────────────────────────────────────── */
function RiskBadge({ level }: { level: RiskLevel }) {
  if (level === "safe")
    return <span className="sk-badge-trust"><ShieldCheck className="w-3 h-3" /> Legitimate</span>;
  if (level === "suspicious")
    return <span className="sk-badge-warn"><AlertTriangle className="w-3 h-3" /> Suspicious</span>;
  return <span className="sk-badge-fraud"><ShieldAlert className="w-3 h-3" /> Fraudulent</span>;
}

/* Risk score ring */
function RiskScoreRing({ score, level }: { score: number; level: RiskLevel }) {
  const color = level === "safe" ? "#059669" : level === "suspicious" ? "#D97706" : "#DC2626";
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - score / 100);
  return (
    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#E2E8F0" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-bold leading-none" style={{ color }}>{score}</p>
        <p className="text-[9px] text-ink-faint dark:text-slate-600 leading-none mt-0.5">RISK</p>
      </div>
    </div>
  );
}

/* Category icon */
function CategoryIcon({ cat }: { cat: RedFlag["category"] }) {
  const cls = "w-3.5 h-3.5 shrink-0 mt-0.5";
  if (cat === "fee") return <IndianRupee className={clsx(cls, "text-fraud")} />;
  if (cat === "domain") return <Mail className={clsx(cls, "text-warning")} />;
  if (cat === "registration") return <Hash className={clsx(cls, "text-fraud")} />;
  if (cat === "salary") return <IndianRupee className={clsx(cls, "text-fraud")} />;
  if (cat === "language") return <FileText className={clsx(cls, "text-warning")} />;
  return <Building2 className={clsx(cls, "text-ink-muted")} />;
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export default function JobScreener({
  lang,
  onAuditComplete,
}: {
  lang: "en" | "hi";
  onAuditComplete: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "loading" | "done">("idle");
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<ScreenResult | null>(null);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [showGreenSignals, setShowGreenSignals] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runScreen = useCallback((text: string, sampleId?: string) => {
    if (!text.trim()) return;
    setMode("loading");
    setShowGreenSignals(false);
    setTimeout(() => {
      const res = screenOfferLetter(text);
      setResult(res);
      setMode("done");
      if (sampleId) setActiveSample(sampleId);
      onAuditComplete();
    }, 1000);
  }, [onAuditComplete]);

  const loadSample = useCallback((s: SampleCase) => {
    setInputText(s.content);
    setCharCount(s.content.length);
    runScreen(s.content, s.id);
  }, [runScreen]);

  /* Read .txt / .doc plain text from uploaded file */
  const handleFile = useCallback((file: File) => {
    setActiveSample(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
      setCharCount(text.length);
      runScreen(text);
    };
    reader.readAsText(file);
  }, [runScreen]);

  const reset = () => {
    setMode("idle"); setResult(null); setInputText("");
    setActiveSample(null); setShowGreenSignals(false); setCharCount(0);
  };

  const downloadReport = () => {
    if (!result) return;
    const e = result.extractedEntities;
    const lines = [
      "=== SATYA KAVACH — JOB OFFER LETTER SCREENING REPORT ===",
      `Timestamp    : ${result.timestamp}`,
      `Risk Level   : ${result.riskLevel.toUpperCase()}`,
      `Risk Score   : ${result.riskScore}/100`,
      `Confidence   : ${result.confidence}%`,
      "",
      "── Extracted Entities ──",
      `Company      : ${e.companyName ?? "Not detected"}`,
      `Email Domain : ${e.emailDomain ? "@" + e.emailDomain : "Not found"}`,
      `CIN          : ${e.cinNumber ?? "Not found"}`,
      `GSTIN        : ${e.gstNumber ?? "Not found"}`,
      `Salary Ref   : ${e.salary ?? "Not found"}`,
      `Fee Mention  : ${e.joiningFee ?? "None"}`,
      `Contact No.  : ${e.contactPhone ?? "Not found"}`,
      "",
      "── Red Flags ──",
      ...(result.redFlags.length
        ? result.redFlags.map((f, i) =>
            `  [${f.severity.toUpperCase()}] ${i + 1}. ${f.label}${f.matchedText ? ` — matched: "${f.matchedText}"` : ""}\n     ${f.detail}`)
        : ["  None detected"]),
      "",
      "── Green Signals ──",
      ...(result.greenSignals.map((s, i) => `  ${i + 1}. ${s.label}`)),
      "",
      "── VERDICT ──",
      result.riskLevel === "fraud"
        ? "DO NOT PROCEED. This offer shows multiple strong indicators of employment fraud. Report to cybercrime.gov.in or call 1930."
        : result.riskLevel === "suspicious"
        ? "VERIFY INDEPENDENTLY before proceeding. Contact the company via their official website phone number, not the contact in this letter."
        : "No major red flags detected. Still recommended to verify CIN at mca.gov.in and GSTIN at gst.gov.in.",
      "",
      "=== END OF REPORT ===",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `satya-kavach-job-screen-${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink dark:text-white">
            {lang === "en" ? "Fake Job & Internship Offer Letter Screener" : "नकली नौकरी व इंटर्नशिप ऑफर लेटर जांचकर्ता"}
          </h1>
          <p className="text-sm text-ink-muted dark:text-slate-400 mt-1">
            {lang === "en"
              ? "Fee Demand Detector · Fake Domain Analyser · CIN/GST Validator · Salary Anomaly Scanner"
              : "शुल्क मांग · नकली डोमेन · CIN/GST सत्यापन · वेतन विसंगति"}
          </p>
        </div>
        {mode === "done" && (
          <button onClick={reset} className="sk-btn-ghost text-xs gap-1.5">
            <RefreshCcw className="w-3.5 h-3.5" />
            {lang === "en" ? "New Scan" : "नई जांच"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── LEFT: Input ── */}
        <div className="flex flex-col gap-5">

          {/* Sample cases */}
          <div className="sk-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-warning" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                {lang === "en" ? "1-Click Demo Cases" : "1-क्लिक डेमो केस"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSample(s)}
                  className={clsx(
                    "rounded-lg border-2 p-3 text-left transition-all hover:shadow-card-hover",
                    activeSample === s.id
                      ? s.expectedRisk === "safe" ? "border-trust" : "border-fraud"
                      : "border-border dark:border-dark-border hover:border-ink-muted"
                  )}
                >
                  <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                    s.expectedRisk === "safe" ? "bg-trust-bg" : "bg-fraud-bg"
                  )}>
                    <BriefcaseBusiness className={clsx(
                      "w-4 h-4",
                      s.expectedRisk === "safe" ? "text-trust" : "text-fraud"
                    )} />
                  </div>
                  <p className="text-[11px] font-semibold text-ink dark:text-white leading-tight">
                    {lang === "en" ? s.label : s.labelHi}
                  </p>
                  <p className="text-[10px] text-ink-muted dark:text-slate-500 mt-0.5">{s.category}</p>
                  <div className="mt-1.5">
                    <RiskBadge level={s.expectedRisk} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Text paste area */}
          <div className="sk-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                {lang === "en" ? "Paste Offer Letter Text" : "ऑफर लेटर टेक्स्ट पेस्ट करें"}
              </span>
              <span className="text-[10px] font-mono text-ink-faint dark:text-slate-600">
                {charCount.toLocaleString()} chars
              </span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); setCharCount(e.target.value.length); }}
              placeholder={lang === "en"
                ? "Paste the full text of the offer letter, email, or WhatsApp message here…"
                : "यहाँ ऑफर लेटर, ईमेल या WhatsApp संदेश का पूरा टेक्स्ट पेस्ट करें…"}
              rows={10}
              className="w-full px-3 py-2.5 text-sm border border-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:focus:ring-white/10 resize-none font-mono leading-relaxed"
            />
            <button
              onClick={() => runScreen(inputText)}
              disabled={!inputText.trim() || mode === "loading"}
              className="sk-btn-primary w-full"
            >
              <Search className="w-4 h-4" />
              {lang === "en" ? "Screen This Offer Letter" : "इस ऑफर लेटर की जांच करें"}
            </button>
          </div>

          {/* File upload */}
          <div
            className={clsx(
              "sk-card rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all p-8",
              dragActive
                ? "border-ink bg-ink/5 dark:border-white dark:bg-white/5"
                : "border-border dark:border-dark-border hover:border-ink-muted hover:bg-surface"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".txt,.text" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="w-12 h-12 rounded-xl bg-surface dark:bg-dark-border border border-border dark:border-dark-border flex items-center justify-center">
              <Upload className="w-5 h-5 text-ink-muted dark:text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-ink dark:text-white">
                {lang === "en" ? "Drop a .txt offer letter file" : ".txt ऑफर लेटर फ़ाइल यहाँ छोड़ें"}
              </p>
              <p className="text-xs text-ink-muted dark:text-slate-500 mt-1">
                {lang === "en" ? "Plain text files only — copy & paste works best for PDFs" : "केवल टेक्स्ट फ़ाइलें — PDF के लिए कॉपी-पेस्ट बेहतर है"}
              </p>
            </div>
          </div>

          {/* Advisory */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-warning-bg border border-warning/20">
            <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-ink dark:text-slate-200 leading-relaxed">
              <span className="font-semibold">
                {lang === "en" ? "Received a suspicious offer? " : "संदिग्ध ऑफर मिला? "}
              </span>
              {lang === "en"
                ? "Report it to the National Cybercrime Portal at cybercrime.gov.in or call the helpline 1930."
                : "इसे cybercrime.gov.in पर रिपोर्ट करें या हेल्पलाइन 1930 पर कॉल करें।"}
            </p>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {mode === "idle" && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center sk-card p-8">
              <div className="w-16 h-16 rounded-2xl bg-surface dark:bg-dark-border border border-border dark:border-dark-border flex items-center justify-center">
                <BriefcaseBusiness className="w-7 h-7 text-ink-faint dark:text-slate-500" />
              </div>
              <p className="font-semibold text-ink dark:text-white">
                {lang === "en" ? "Awaiting offer letter" : "ऑफर लेटर की प्रतीक्षा"}
              </p>
              <p className="text-sm text-ink-muted dark:text-slate-400">
                {lang === "en"
                  ? "Select a demo case, paste the full text, or drop a .txt file."
                  : "डेमो केस चुनें, टेक्स्ट पेस्ट करें या .txt फ़ाइल छोड़ें।"}
              </p>
            </div>
          )}

          {mode === "loading" && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 sk-card p-8">
              <div className="w-8 h-8 border-2 border-ink dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-ink-muted dark:text-slate-400">
                {lang === "en" ? "Running 5-layer forensic screen…" : "5-परत फॉरेंसिक स्क्रीन चल रही है…"}
              </p>
            </div>
          )}

          {mode === "done" && result && (
            <>
              {/* Verdict card with risk score ring */}
              <div className={clsx(
                "sk-card p-5 border-l-4",
                result.riskLevel === "safe"       && "border-l-trust",
                result.riskLevel === "suspicious"  && "border-l-warning",
                result.riskLevel === "fraud"       && "border-l-fraud",
              )}>
                <div className="flex items-center gap-4">
                  <RiskScoreRing score={result.riskScore} level={result.riskLevel} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400 mb-1.5">
                      {lang === "en" ? "Screening Verdict" : "स्क्रीनिंग निर्णय"}
                    </p>
                    <RiskBadge level={result.riskLevel} />
                    <p className="text-xs text-ink-muted dark:text-slate-400 mt-1.5 font-mono">
                      {result.confidence}% confidence · {result.redFlags.length} flag{result.redFlags.length !== 1 ? "s" : ""} · {result.greenSignals.length} signal{result.greenSignals.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-ink-faint dark:text-slate-600">Screened at</p>
                    <p className="text-[11px] font-mono text-ink-muted dark:text-slate-400">{result.timestamp}</p>
                  </div>
                </div>

                {/* Verdict message */}
                <div className={clsx(
                  "mt-3 p-3 rounded-lg text-xs leading-relaxed",
                  result.riskLevel === "fraud"      && "bg-fraud-bg text-fraud font-medium",
                  result.riskLevel === "suspicious"  && "bg-warning-bg text-warning font-medium",
                  result.riskLevel === "safe"        && "bg-trust-bg text-trust",
                )}>
                  {result.riskLevel === "fraud" && "DO NOT pay any amount. Do NOT share personal documents. Report this offer to cybercrime.gov.in or call 1930."}
                  {result.riskLevel === "suspicious" && "Verify independently — call the company's official number (not from this letter) before responding."}
                  {result.riskLevel === "safe" && "No major red flags detected. Verify CIN at mca.gov.in and GSTIN at gst.gov.in as a final step."}
                </div>
              </div>

              {/* Extracted entities */}
              {Object.values(result.extractedEntities).some(Boolean) && (
                <div className="sk-card p-4 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                    {lang === "en" ? "Extracted Entities" : "निकाली गई जानकारी"}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: <Building2 className="w-3.5 h-3.5 text-ink-muted" />, label: "Company",    val: result.extractedEntities.companyName },
                      { icon: <Mail      className="w-3.5 h-3.5 text-ink-muted" />, label: "Email Domain", val: result.extractedEntities.emailDomain ? "@" + result.extractedEntities.emailDomain : undefined },
                      { icon: <Hash      className="w-3.5 h-3.5 text-ink-muted" />, label: "CIN",         val: result.extractedEntities.cinNumber },
                      { icon: <Hash      className="w-3.5 h-3.5 text-ink-muted" />, label: "GSTIN",       val: result.extractedEntities.gstNumber },
                      { icon: <IndianRupee className="w-3.5 h-3.5 text-ink-muted" />, label: "Salary Ref", val: result.extractedEntities.salary },
                      { icon: <IndianRupee className="w-3.5 h-3.5 text-ink-muted" />, label: "Fee Mention", val: result.extractedEntities.joiningFee },
                    ].filter(r => r.val).map(({ icon, label, val }) => (
                      <div key={label} className="bg-surface dark:bg-dark-surface rounded-lg p-2.5 border border-border dark:border-dark-border">
                        <div className="flex items-center gap-1 mb-1">
                          {icon}
                          <span className="text-[10px] font-medium text-ink-faint dark:text-slate-600">{label}</span>
                        </div>
                        <p className="sk-mono text-xs text-ink dark:text-slate-200 break-all">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Red Flags */}
              {result.redFlags.length > 0 && (
                <div className="sk-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-fraud" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                      {lang === "en" ? `Red Flags (${result.redFlags.length})` : `चेतावनी संकेत (${result.redFlags.length})`}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {result.redFlags.map((flag, i) => (
                      <div key={i} className="flex gap-2.5">
                        <CategoryIcon cat={flag.category} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={clsx(
                              "text-xs font-semibold",
                              flag.severity === "high" ? "text-fraud" : flag.severity === "medium" ? "text-warning" : "text-ink-muted"
                            )}>
                              {flag.label}
                            </p>
                            <span className={clsx(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                              flag.severity === "high"   ? "bg-fraud-bg text-fraud" :
                              flag.severity === "medium" ? "bg-warning-bg text-warning" :
                              "bg-surface text-ink-muted"
                            )}>
                              {flag.severity}
                            </span>
                          </div>
                          {flag.matchedText && (
                            <p className="sk-mono text-[10px] text-ink-muted dark:text-slate-400 mt-0.5 bg-surface dark:bg-dark-surface rounded px-2 py-0.5 inline-block max-w-full truncate border border-border dark:border-dark-border">
                              "{flag.matchedText}"
                            </p>
                          )}
                          <p className="text-[11px] text-ink-muted dark:text-slate-400 mt-1 leading-relaxed">
                            {flag.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Green Signals (collapsible) */}
              {result.greenSignals.length > 0 && (
                <div className="sk-card p-4 space-y-2">
                  <button
                    className="w-full flex items-center justify-between"
                    onClick={() => setShowGreenSignals(s => !s)}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-trust" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                        {lang === "en" ? `Clean Signals (${result.greenSignals.length})` : `स्वच्छ संकेत`}
                      </span>
                    </div>
                    {showGreenSignals ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                  </button>
                  {showGreenSignals && (
                    <ul className="space-y-2 mt-2">
                      {result.greenSignals.map((s, i) => (
                        <li key={i} className="space-y-0.5">
                          <p className="flex items-start gap-2 text-xs font-medium text-trust">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            {s.label}
                          </p>
                          <p className="text-[11px] text-ink-muted dark:text-slate-400 ml-5">{s.detail}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Download */}
              <button onClick={downloadReport} className="sk-btn-primary w-full">
                <Download className="w-4 h-4" />
                {lang === "en" ? "Download Screening Report (.txt)" : "स्क्रीनिंग रिपोर्ट डाउनलोड करें"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
