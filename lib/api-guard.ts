import { NextRequest, NextResponse } from "next/server";

export interface GuardOptions {
  maxPayloadBytes?: number; // default 10MB
  allowedTypes?: string[];
}

export interface GuardErrorResponse {
  error: string;
  code: string;
  details?: string;
  status: number;
}

const MAX_DEFAULT_PAYLOAD = 10 * 1024 * 1024; // 10MB limit

/**
 * Sanitizes generic string inputs against null bytes and control chars
 */
export function sanitizeString(input: string, maxLength = 10000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, maxLength)
    .trim();
}

/**
 * Validates and extracts safe base64 image or document content
 */
export function sanitizeBase64(rawBase64?: string): { safeBase64?: string; mimeType: string; byteSize: number } {
  if (!rawBase64 || typeof rawBase64 !== "string") {
    return { mimeType: "application/octet-stream", byteSize: 0 };
  }

  let mimeType = "image/jpeg";
  let cleanData = rawBase64.trim();

  const dataUriMatch = cleanData.match(/^data:([a-zA-Z0-9\/+-]+);base64,(.+)$/);
  if (dataUriMatch) {
    mimeType = dataUriMatch[1];
    cleanData = dataUriMatch[2];
  }

  // Basic base64 character set validation
  cleanData = cleanData.replace(/[^A-Za-z0-9+/=]/g, "");
  const estimatedBytes = Math.floor((cleanData.length * 3) / 4);

  return {
    safeBase64: cleanData,
    mimeType,
    byteSize: estimatedBytes,
  };
}

/**
 * Extracts client IP safely across proxies / CDNs
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Higher-order error-boundary wrapper for Next.js route handlers
 */
export function withApiGuard<T = any>(
  handler: (req: NextRequest, body: T, clientIp: string) => Promise<NextResponse>,
  options: GuardOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const maxBytes = options.maxPayloadBytes ?? MAX_DEFAULT_PAYLOAD;
    const clientIp = getClientIp(req);

    // 1. Content-Length Header Guard
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      return NextResponse.json(
        {
          error: "Payload too large",
          code: "PAYLOAD_TOO_LARGE",
          details: `Uploaded payload exceeds maximum allowed size of ${(maxBytes / (1024 * 1024)).toFixed(1)}MB.`,
          status: 413,
        },
        { status: 413 }
      );
    }

    // 2. Safe JSON Parsing
    let body: any;
    try {
      body = await req.json();
    } catch (parseError: any) {
      return NextResponse.json(
        {
          error: "Malformed JSON payload",
          code: "INVALID_JSON",
          details: "Failed to parse request body as valid JSON format.",
          status: 400,
        },
        { status: 400 }
      );
    }

    // 3. Execution inside Error Boundary
    try {
      return await handler(req, body, clientIp);
    } catch (err: any) {
      console.error("[SatyaKavach API Guard caught error]:", err);
      return NextResponse.json(
        {
          error: "Forensic pipeline processing error",
          code: "INTERNAL_PIPELINE_ERROR",
          details: err?.message || "An unexpected error occurred while executing the forensic pipeline.",
          status: 500,
        },
        { status: 500 }
      );
    }
  };
}
