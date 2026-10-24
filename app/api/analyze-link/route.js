import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    // Server-side heuristics (Hackers cannot see or tamper with this logic)
    const riskyTLDs = ['.xyz', '.top', '.club', '.online', '.vip'];
    const suspiciousKeywords = ['sbi', 'kyc', 'upi', 'update', 'pan', 'hdfc'];
    
    const lowerUrl = url.toLowerCase();
    let riskLevel = 'Safe';
    let reasons = [];

    // 1. Check for cheap/abused top-level domains
    if (riskyTLDs.some(tld => lowerUrl.includes(tld))) {
      riskLevel = 'Dangerous';
      reasons.push("Uses a high-risk top-level domain often associated with burner phishing sites.");
    }
    
    // 2. Check for brand impersonation (Typosquatting)
    if (suspiciousKeywords.some(kw => lowerUrl.includes(kw)) && !lowerUrl.includes('.gov.in') && !lowerUrl.includes('sbi.co.in')) {
      riskLevel = 'Dangerous';
      reasons.push("Brand impersonation detected: URL contains official keywords but is not an official government or banking domain.");
    }

    // 3. Check for raw IP addresses (e.g., http://192.168.1.1/update)
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
    if (ipRegex.test(lowerUrl)) {
      riskLevel = 'Dangerous';
      reasons.push("URL uses a direct IP address instead of a registered domain name.");
    }

    return NextResponse.json({ riskLevel, reasons });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process URL securely" }, { status: 500 });
  }
}