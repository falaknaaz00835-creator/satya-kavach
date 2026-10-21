'use client';

import React, { useState } from 'react';
import {
  FileSearch,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Hash,
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  Calculator,
} from 'lucide-react';
import RealTimeGroundingCard from '@/components/RealTimeGroundingCard';

interface DocumentInspectorProps {
  lang: 'en' | 'hi';
  onAuditComplete: (report?: any) => void;
}

export default function DocumentInspector({ lang, onAuditComplete }: DocumentInspectorProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeDemo, setActiveDemo] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Line items state for arithmetic tampering test
  const [items, setItems] = useState([
    { description: 'Consulting Services', price: 15000, qty: 1 },
    { description: 'Hardware License', price: 8500, qty: 2 },
  ]);
  const [printedTotal, setPrintedTotal] = useState(45000); // Intentionally inflated

  const demoCases = [
    {
      id: 1,
      title: 'Genuine Tax Invoice',
      type: 'Safe',
      risk: 'LOW',
      filename: 'tax-invoice-verified.pdf',
      items: [{ description: 'Cloud Infrastructure Service', price: 5000, qty: 2 }],
      printedTotal: 11800, // 10000 + 18% = 11800 (Correct)
    },
    {
      id: 2,
      title: 'Tampered Medical / Utility Bill',
      type: 'Fraudulent',
      risk: 'HIGH',
      filename: 'fraud-hospital-bill.pdf',
      items: [
        { description: 'Emergency Consultation', price: 12000, qty: 1 },
        { description: 'Pharmacy Prescription', price: 3000, qty: 1 },
      ],
      printedTotal: 48000, // 15000 + 18% = 17700 != 48000 (Math Tampering)
    },
  ];

  const runDocumentScan = async (params: {
    filename: string;
    fileBase64?: string;
    items?: Array<{ price: number; qty: number; description?: string }>;
    printedTotal?: number;
  }) => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/forensics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'document',
          payload: {
            filename: params.filename,
            fileBase64: params.fileBase64,
            items: params.items || items,
            printedTotal: params.printedTotal ?? printedTotal,
          },
          lang,
        }),
      });

      if (!response.ok) throw new Error('API Error');
      const liveReport = await response.json();
      setAnalysis(liveReport);
      onAuditComplete(liveReport);
    } catch (error) {
      console.error('Document scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDemoClick = (demo: (typeof demoCases)[0]) => {
    setActiveDemo(demo.id);
    setSelectedFile(null);
    setItems(demo.items);
    setPrintedTotal(demo.printedTotal);
    runDocumentScan({
      filename: demo.filename,
      items: demo.items,
      printedTotal: demo.printedTotal,
    });
  };

  const handleFileUpload = (file: File) => {
    setSelectedFile(file);
    setActiveDemo(null);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string) || '';
      runDocumentScan({
        filename: file.name,
        fileBase64: base64,
        items,
        printedTotal,
      });
    };
    reader.readAsDataURL(file.slice(0, 32768));
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <FileSearch className="w-5 h-5" />
          </span>
          <h2 className="text-xl font-bold text-ink dark:text-white">
            {lang === 'en' ? 'Document Forensics & Bill Tampering' : 'दस्तावेज़ फॉरेंसिक और बिल जांच'}
          </h2>
        </div>
        <p className="text-xs text-ink-muted dark:text-slate-400 mt-1 font-mono">
          Binary EXIF / Tool Signature Sniffing · Line-Item Math Auditor · PDF Tampering Verification
        </p>
      </div>

      {/* 1-Click Demo Scenarios */}
      <div className="sk-card p-5 dark:bg-dark-card border border-border dark:border-dark-border">
        <h3 className="text-xs font-semibold text-ink-muted dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 font-mono">
          <Activity className="w-4 h-4 text-emerald-600" />
          {lang === 'en' ? 'One-Click Reference Scenarios' : 'एक-क्लिक संदर्भ परिदृश्य'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoCases.map((demo) => (
            <button
              key={demo.id}
              onClick={() => handleDemoClick(demo)}
              disabled={isScanning}
              className={`text-left p-4 rounded-xl border transition-all ${
                activeDemo === demo.id
                  ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                  : 'border-border dark:border-dark-border hover:border-slate-300 dark:hover:border-slate-600 bg-surface dark:bg-dark-surface/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-ink dark:text-white">{demo.title}</span>
                <span
                  className={
                    demo.type === 'Safe'
                      ? 'sk-badge-trust'
                      : 'sk-badge-fraud'
                  }
                >
                  {demo.type === 'Safe' ? '✓ Genuine' : '⚠ Tampered'}
                </span>
              </div>
              <p className="text-xs text-ink-muted dark:text-slate-400 font-mono">
                Sample File: {demo.filename}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Itemized Math & File Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Upload Box */}
        <div className="border-2 border-dashed border-border dark:border-dark-border rounded-xl p-6 flex flex-col items-center justify-center bg-card dark:bg-dark-card hover:bg-surface dark:hover:bg-dark-surface/50 transition-colors">
          <FileSearch className="w-8 h-8 text-ink-faint dark:text-slate-500 mb-2" />
          <p className="text-xs text-ink dark:text-white font-medium mb-1">
            Upload PDF / Bill / Notice
          </p>
          <p className="text-[11px] text-ink-muted dark:text-slate-400 font-mono mb-4 text-center">
            Extracts binary signatures & checks for Photoshop/Canva modification traces
          </p>
          <input
            type="file"
            accept=".pdf,image/png,image/jpeg"
            className="hidden"
            id="doc-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <label htmlFor="doc-upload" className="sk-btn-primary cursor-pointer text-xs">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {isScanning ? 'Inspecting binary headers...' : 'Choose Document File'}
          </label>
          {selectedFile && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-2">
              Loaded: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Math Auditor Controls */}
        <div className="sk-card p-5 dark:bg-dark-card border border-border dark:border-dark-border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-ink dark:text-white">
                Line-Item Invoice Arithmetic Cross-Check
              </h4>
            </div>
            <p className="text-[11px] text-ink-muted dark:text-slate-400 font-mono mb-3">
              Detects inflated grand totals on fake hospital, utility, or supplier bills.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-ink-muted dark:text-slate-400 font-mono">
                <span>Item 1: ₹15,000 x 1</span>
                <span>₹15,000</span>
              </div>
              <div className="flex justify-between items-center text-ink-muted dark:text-slate-400 font-mono">
                <span>Item 2: ₹8,500 x 2</span>
                <span>₹17,000</span>
              </div>
              <div className="flex justify-between items-center text-ink-muted dark:text-slate-400 font-mono">
                <span>Expected GST (18%):</span>
                <span>₹5,760</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border dark:border-dark-border font-bold text-ink dark:text-white font-mono">
                <span>Expected True Total:</span>
                <span className="text-emerald-600">₹37,760</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border dark:border-dark-border flex items-center justify-between">
            <span className="text-xs text-ink-muted dark:text-slate-400 font-mono">
              Printed on Bill: ₹{printedTotal.toLocaleString('en-IN')}
            </span>
            <button
              onClick={() => runDocumentScan({ filename: 'manual-audit.pdf' })}
              disabled={isScanning}
              className="sk-btn-primary text-xs py-1.5 px-3"
            >
              Verify Math Now
            </button>
          </div>
        </div>
      </div>

      {/* Results Panel */}
      {analysis && (
        <div className="sk-card p-6 dark:bg-dark-card border border-border dark:border-dark-border space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border dark:border-dark-border pb-3">
            <div className="flex items-center gap-2">
              {analysis.verdict === 'fraud' ? (
                <span className="sk-badge-fraud text-sm px-3 py-1">
                  <ShieldAlert className="w-4 h-4" />
                  DOCUMENT TAMPERING DETECTED • {analysis.riskScore}%
                </span>
              ) : (
                <span className="sk-badge-trust text-sm px-3 py-1">
                  <ShieldCheck className="w-4 h-4" />
                  DOCUMENT VERIFIED • SAFE
                </span>
              )}
            </div>
            {analysis.sha256 && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-muted dark:text-slate-400 bg-surface dark:bg-dark-surface px-2.5 py-1 rounded-md border border-border dark:border-dark-border">
                <Hash className="w-3 h-3 text-emerald-600" />
                <span className="truncate max-w-[200px]">SHA-256: {analysis.sha256}</span>
              </div>
            )}
          </div>

          {/* Real-Time Gemini AI Grounding & Web Intelligence */}
          {(analysis.entityProfile || analysis.liveWebStatus) && (
            <RealTimeGroundingCard
              entityProfile={analysis.entityProfile}
              liveWebStatus={analysis.liveWebStatus}
              riskRationale={analysis.riskRationale}
              actionSteps={analysis.actionSteps}
              provider={analysis.telemetry?.provider}
              lang={lang}
            />
          )}

          {/* Evidence findings */}
          <div>
            <p className="text-xs font-semibold text-ink dark:text-white mb-2">
              Forensic Evidence Points:
            </p>
            <ul className="space-y-1.5">
              {analysis.evidence?.map((flag: string, i: number) => (
                <li
                  key={i}
                  className="text-xs text-ink-muted dark:text-slate-300 flex items-start gap-2 leading-relaxed"
                >
                  {analysis.verdict === 'fraud' ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Telemetry Footer */}
          <div className="pt-3 border-t border-border dark:border-dark-border flex items-center justify-between text-[10px] font-mono text-ink-faint dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-emerald-600" />
              {analysis.telemetry?.provider} ({analysis.telemetry?.model})
            </span>
            <span>~{analysis.telemetry?.latencyMs}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}