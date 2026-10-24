import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { clientHash, artifactType } = await request.json();
    
    // 1. Generate a tamper-proof server timestamp
    const serverTimestamp = new Date().toISOString();
    
    // 2. Use a secure server environment variable as a salt (fallback provided for local testing)
    const serverSalt = process.env.BSA_SECRET_KEY || 'satya-kavach-master-key-2026';
    
    // 3. Cryptographically bind the user's file hash with the exact server time
    const finalSignature = crypto
      .createHash('sha256')
      .update(clientHash + serverTimestamp + serverSalt)
      .digest('hex');

    return NextResponse.json({
      success: true,
      certifiedHash: finalSignature,
      timestamp: serverTimestamp,
      legalDisclaimer: "Electronic Record Certified under Section 63 of Bharatiya Sakshya Adhiniyam (BSA) 2023"
    });
  } catch (error) {
    return NextResponse.json({ error: "Secure dossier generation failed" }, { status: 500 });
  }
}