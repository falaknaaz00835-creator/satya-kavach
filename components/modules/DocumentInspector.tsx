'use client';

import React, { useState } from 'react';

interface DocumentInspectorProps {
  lang: 'en' | 'hi';
  onAuditComplete: (report: any) => void;
}

export default function DocumentInspector({ lang, onAuditComplete }: DocumentInspectorProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleScan = () => {
    setIsScanning(true);
    // Simulate forensic document analysis (metadata extraction & pixel ELA)
    setTimeout(() => {
      const mockReport = {
        id: `DOC-${Math.floor(Math.random() * 10000)}`,
        module: 'Document Inspector',
        riskLevel: 'CRITICAL',
        flags: [
          'PDF metadata indicates recent Adobe Photoshop 2024 edits.',
          'Clone-stamp pixel repetition detected in "Amount Due" field.',
          'Line-item arithmetic discrepancy (Tax + Subtotal ≠ Total).'
        ],
        timestamp: new Date().toISOString(),
      };
      setAnalysis(mockReport);
      setIsScanning(false);
      onAuditComplete(mockReport); // Triggers the Saved Audit Log drawer in app/page.tsx
    }, 2500);
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
        {lang === 'en' ? 'Fake Document & Tampered Bill Inspector' : 'फर्जी दस्तावेज़ और बिल इंस्पेक्टर'}
      </h2>
      
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 mb-6">
        <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">
          {lang === 'en' ? 'Drop invoice, receipt, or ID PDF here' : 'यहां चालान, रसीद या आईडी पीडीएफ छोड़ें'}
        </p>
        <button 
          onClick={handleScan}
          disabled={isScanning}
          className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-5 py-2.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isScanning && (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isScanning 
            ? (lang === 'en' ? 'Verifying Integrity...' : 'सत्यापन हो रहा है...') 
            : (lang === 'en' ? 'Scan Document' : 'दस्तावेज़ स्कैन करें')}
        </button>
      </div>

      {analysis && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 rounded-r-md text-sm">
          <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">
            {lang === 'en' ? 'Tampering Traces Found (Critical)' : 'छेड़छाड़ के निशान मिले (गंभीर)'}
          </h3>
          <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300 space-y-1.5 mt-2">
            {analysis.flags.map((flag: string, idx: number) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}