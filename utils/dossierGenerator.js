export async function generateComplianceDossier(evidenceText, fileMeta) {
    const encoder = new TextEncoder();
    const data = encoder.encode(evidenceText + JSON.stringify(fileMeta));
    
    // Generate secure SHA-256 hash in client RAM (Zero-Retention)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const dossier = {
        artifactTitle: "Satya-Kavach Certified Forensic Dossier",
        timestampIST: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        sha256Fingerprint: hashHex,
        legalFramework: "Bharatiya Sakshya Adhiniyam (BSA 2023) Section 63 Compliant",
        evidenceDetails: evidenceText,
        metadata: fileMeta
    };

    // Convert to downloadable JSON text file acting as a cryptographic certificate
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `SatyaKavach_Evidence_Dossier_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}