// utils/linkInspector.js

/**
 * Inspects URLs for common phishing heuristics and fake government/banking domain patterns.
 */
export function inspectScamLink(urlString) {
    try {
        const url = new URL(urlString);
        const domain = url.hostname.toLowerCase();
        
        const suspiciousKeywords = ['sbi', 'paytm', 'gov', 'cybercrime', 'police', 'upi', 'verify', 'update', 'kyc'];
        const isTargetingBrand = suspiciousKeywords.some(keyword => domain.includes(keyword));
        
        // Check for common malicious TLDs or IP-based hosting
        const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(domain);
        const hasSuspiciousTld = domain.endsWith('.xyz') || domain.endsWith('.top') || domain.endsWith('.club') || domain.endsWith('.buzz');

        let riskScore = 10;
        let reasons = [];

        if (isIpAddress) {
            riskScore += 50;
            reasons.push("Host uses raw IP address instead of registered domain.");
        }
        if (hasSuspiciousTld) {
            riskScore += 30;
            reasons.push("Domain uses high-risk TLD commonly associated with phishing campaigns.");
        }
        if (isTargetingBrand && !domain.endsWith('.gov.in') && !domain.endsWith('.co.in')) {
            riskScore += 40;
            reasons.push("Domain mimics trusted Indian institutions (SBI/Govt/UPI) without official TLD accreditation.");
        }

        return {
            url: urlString,
            domain: domain,
            riskScore: Math.min(riskScore, 99),
            status: riskScore > 50 ? "HIGH RISK - Phishing URL Detected" : "Low Risk / Unverified",
            reasons: reasons.length > 0 ? reasons : ["No immediate anomaly detected. Proceed with caution."]
        };
    } catch (e) {
        return { riskScore: 100, status: "Invalid URL Format", reasons: ["Malformed or dangerous string structure."] };
    }
}