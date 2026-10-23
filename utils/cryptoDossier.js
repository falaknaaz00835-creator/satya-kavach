// utils/cryptoDossier.js

/**
 * Generates a SHA-256 cryptographic hash of any evidence file locally in the browser.
 * Complies with Section 63 BSA 2023 evidentiary standards.
 */
export async function generateEvidenceHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        sha256Hash: hashHex,
        timestampIST: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        legalStandard: "BSA 2023 Section 63 Compliant Digital Artifact"
    };
}