'use client';

import React, { useState } from 'react';

interface DocumentInspectorProps {
  lang: 'en' | 'hi';
  onAuditComplete: (report: any) => void;
}

export default function DocumentInspector({ lang, onAuditComplete }: DocumentInspectorProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeDemo, setActiveDemo] = useState<number | null>(null);

  const demoCases = [
    { id: 1, title: 'Genuine Tax Invoice', type: 'Safe', risk: 'LOW' },
    { id: 2, title: 'Forged Medical Bill', type: 'Fraudulent', risk: 'HIGH' },
  ];

  const scanRealFile = async (file: File) => {
    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/v1/document/scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('API Error');
      const liveReport = await response.json();
      setAnalysis(liveReport);
      onAuditComplete(liveReport);
    } catch (error) {
      console.error(error);
      const fallback = {
        id: `DOC-ERR`,
        riskLevel: 'HIGH',
        flags: ['Network Error: API unreachable'],
        timestamp: new Date().toISOString(),
      };
      setAnalysis(fallback);
      onAuditComplete(fallback);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDemoScan = async (demoId: number) => {
    setActiveDemo(demoId);
    // For demo clicks, create a dummy file just to trigger the API logic
    const dummyName = demoId === 2 ? 'fraud-doc.pdf' : 'safe-doc.pdf';
    const dummyFile = new File(['dummy content'], dummyName, { type: 'application/pdf' });
    await scanRealFile(dummyFile);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {lang === 'en' ? 'Document Forensics & OCR' : 'दस्तावेज़ फॉरेंसिक और OCR'}
        </h2>
        <p className="text-sm text-slate-500">Metadata Analysis · Bill Tampering · CIN/GSTIN Validation</p>
      </div>

      {/* 1-Click Demo Cases */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          1-Click Demo Cases
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoCases.map((demo) => (
            <button
              key={demo.id}
              onClick={() => handleDemoScan(demo.id)}
              className={`text-left p-4 rounded-lg border transition-all ${
                activeDemo === demo.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold text-slate-800 dark:text-slate-200">{demo.title}</div>
              <div className="text-xs text-slate-500 mt-1 mb-3">Pre-loaded PDF sample</div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                demo.type === 'Safe' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {demo.type === 'Safe' ? '✓ Genuine' : '✗ Fraudulent'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Real Manual Upload Area */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50">
        <svg className="w-8 h-8 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <input 
          type="file" 
          accept=".pdf,image/png,image/jpeg" 
          className="hidden" 
          id="doc-upload"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) scanRealFile(file);
          }}
        />
        <label 
          htmlFor="doc-upload"
          className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer"
        >
          {isScanning ? 'Extracting Data...' : 'Upload real document (PDF/JPG)'}
        </label>
      </div>

      {/* Results Panel */}
      {analysis && (
        <div className={`p-4 rounded-lg border-l-4 ${analysis.riskLevel === 'HIGH' ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
          <h3 className={`font-semibold mb-2 ${analysis.riskLevel === 'HIGH' ? 'text-red-800' : 'text-green-800'}`}>
            {analysis.riskLevel === 'HIGH' ? 'Tampering Detected (High Risk)' : 'Document Verified (Low Risk)'}
          </h3>
          <ul className="list-disc pl-5 mt-2 text-sm text-slate-700 space-y-1">
            {analysis.flags?.map((flag: string, i: number) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}