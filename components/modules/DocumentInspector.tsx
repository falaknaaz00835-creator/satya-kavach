'use client';

import React, { useState, useEffect } from 'react';
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
import { takeIntake } from '@/lib/intake';
import { InstrumentHeader, AwaitingFindings } from '@/components/instrument';

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

  /* ── Universal intake: a document routed from the home desk ── */
  useEffect(() => {
    const incoming = takeIntake('document');
    if (incoming) handleFileUpload(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-6 sm:px-8 flex flex-col gap-6">
      <InstrumentHeader
        no="05"
        note={lang === "en" ? "Document forensics" : "दस्तावेज़ फॉरेंसिक"}
        title={lang === "en" ? "Document & bill" : "दस्तावेज़ व बिल"}
        methods={
          lang === "en"
            ? "Binary headers · editor signatures · line-item math · seal check"
            : "बाइनरी हेडर · एडिटर हस्ताक्षर · लाइन-आइटम गणित · मुहर जाँच"
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <div className="flex flex-col gap-5">
      {/* 1-Click Demo Scenarios */}
      <div className="overflow-hidden rounded-xl border border-rule bg-card dark:border-dark-border dark:bg-dark-card">
        <h3 className="flex items-center gap-2 border-b border-rule/80 px-3.5 py-2 font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:border-white/10 dark:text-white/35">
          <Activity className="h-3.5 w-3.5" strokeWidth={1.8} />
          {lang === 'en' ? 'Reference documents' : 'संदर्भ दस्तावेज़'}
        </h3>
        <div className="divide-y divide-rule/80 dark:divide-white/10">
          {demoCases.map((demo) => (
            <button
              key={demo.id}
              onClick={() => handleDemoClick(demo)}
              disabled={isScanning}
              className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors ${
                activeDemo === demo.id ? 'bg-paper-sunk dark:bg-white/[0.05]' : 'hover:bg-paper-sunk/60 dark:hover:bg-white/[0.03]'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink dark:text-white/90">{demo.title}</span>
                <span className="mt-0.5 block truncate font-mono text-[10px] text-ink-faint dark:text-white/30">
                  {demo.filename}
                </span>
              </span>
              <span className={demo.type === 'Safe' ? 'sk-badge-trust' : 'sk-badge-fraud'}>
                {demo.type === 'Safe' ? '✓ Genuine' : '⚠ Tampered'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Itemized Math & File Upload Grid */}
      <div className="grid grid-cols-1 gap-5">
        {/* Upload Box */}
        <div className="relative flex min-h-[148px] flex-col items-center justify-center rounded-xl border border-dashed border-rule-strong/80 bg-card/40 px-4 py-6 text-center transition-colors hover:border-ink-faint hover:bg-card dark:bg-white/[0.02] dark:hover:border-white/30 dark:hover:bg-white/[0.04]">
          <FileSearch className="mb-2 h-5 w-5 text-ink-faint dark:text-white/30" strokeWidth={1.6} />
          <p className="text-[13px] font-medium text-ink dark:text-white">
            Drop a PDF, bill or notice
          </p>
          <p className="mb-3 mt-1 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-ink-faint dark:text-white/30">
            Binary + EXIF signature check
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
            <p className="text-xs text-trust font-mono mt-2">
              Loaded: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Math Auditor Controls */}
        <div className="sk-card p-5 dark:bg-dark-card border border-rule dark:border-dark-border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Calculator className="w-4 h-4 text-trust" />
              <h4 className="text-xs font-bold text-ink dark:text-white">
                Line-Item Invoice Arithmetic Cross-Check
              </h4>
            </div>
            <p className="text-[11px] text-ink-muted dark:text-white/45 font-mono mb-3">
              Detects inflated grand totals on fake hospital, utility, or supplier bills.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-ink-muted dark:text-white/45 font-mono">
                <span>Item 1: ₹15,000 x 1</span>
                <span>₹15,000</span>
              </div>
              <div className="flex justify-between items-center text-ink-muted dark:text-white/45 font-mono">
                <span>Item 2: ₹8,500 x 2</span>
                <span>₹17,000</span>
              </div>
              <div className="flex justify-between items-center text-ink-muted dark:text-white/45 font-mono">
                <span>Expected GST (18%):</span>
                <span>₹5,760</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-rule dark:border-dark-border font-bold text-ink dark:text-white font-mono">
                <span>Expected True Total:</span>
                <span className="text-trust">₹37,760</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rule dark:border-dark-border flex items-center justify-between">
            <span className="text-xs text-ink-muted dark:text-white/45 font-mono">
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

        </div>

        <div className="flex flex-col gap-4">
      {!analysis && !isScanning && (
        <AwaitingFindings
          icon={FileSearch}
          title={lang === 'en' ? 'Nothing inspected yet' : 'अभी कोई जाँच नहीं'}
          body={
            lang === 'en'
              ? 'Load a reference document or drop the bill, notice or PDF you were sent. Metadata, math and a verdict appear here.'
              : 'संदर्भ दस्तावेज़ खोलें या भेजा गया बिल, नोटिस या PDF डालें। मेटाडेटा, गणित और निर्णय यहाँ आएँगे।'
          }
          steps={
            lang === 'en'
              ? ['No court, discom or bank demands payment over WhatsApp', 'A real notice carries a reference number you can verify', 'Line-item totals should add up — forged ones rarely do']
              : ['कोई कोर्ट, बिजली विभाग या बैंक व्हाट्सएप पर भुगतान नहीं माँगता', 'असली नोटिस में जाँचने योग्य संदर्भ संख्या होती है', 'लाइन-आइटम का जोड़ मिलना चाहिए — जाली में नहीं मिलता']
          }
        />
      )}

      {/* Results Panel */}
      {analysis && (
        <div className="sk-card p-6 dark:bg-dark-card border border-rule dark:border-dark-border space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule dark:border-dark-border pb-3">
            <div className="flex items-center gap-2">
              {analysis.verdict === 'fraud' ? (
                <span className="sk-badge-fraud !text-[10px]">
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
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-muted dark:text-white/45 bg-paper-sunk dark:bg-white/[0.03] px-2.5 py-1 rounded-md border border-rule dark:border-dark-border">
                <Hash className="w-3 h-3 text-trust" />
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
                  className="text-xs text-ink-muted dark:text-white/60 flex items-start gap-2 leading-relaxed"
                >
                  {analysis.verdict === 'fraud' ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-trust shrink-0 mt-0.5" />
                  )}
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Telemetry Footer */}
          <div className="pt-3 border-t border-rule dark:border-dark-border flex items-center justify-between text-[10px] font-mono text-ink-faint dark:text-white/35">
            <span className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-trust" />
              {analysis.telemetry?.provider} ({analysis.telemetry?.model})
            </span>
            <span>~{analysis.telemetry?.latencyMs}ms</span>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}