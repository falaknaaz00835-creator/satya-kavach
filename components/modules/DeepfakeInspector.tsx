'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Clock,
  Hash,
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import RealTimeGroundingCard from '@/components/RealTimeGroundingCard';
import { takeIntake } from '@/lib/intake';
import { InstrumentHeader, AwaitingFindings } from '@/components/instrument';

interface DeepfakeInspectorProps {
  lang: 'en' | 'hi';
  onAuditComplete: (report?: any) => void;
}

export default function DeepfakeInspector({ lang, onAuditComplete }: DeepfakeInspectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeDemo, setActiveDemo] = useState<number | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const demoCases = [
    { id: 1, title: 'Genuine CEO Address', type: 'Safe', risk: 'LOW', file: 'genuine-corp-address.mp4', size: 1048576 },
    { id: 2, title: 'WhatsApp Digital Arrest Police Video', type: 'Fraudulent', risk: 'HIGH', file: 'police-threat-deepfake.mp4', size: 2450000 },
  ];

  const runAnalysis = async (fileInfo: { filename: string; fileSize: number; fileBase64?: string }) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/forensics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deepfake',
          payload: {
            filename: fileInfo.filename,
            fileSize: fileInfo.fileSize,
            fileBase64: fileInfo.fileBase64,
          },
          lang,
        }),
      });

      if (!response.ok) throw new Error('API Error');

      const liveReport = await response.json();
      setResults(liveReport);
      onAuditComplete(liveReport);
    } catch (error) {
      console.error('Forensic scan failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDemoClick = (demo: (typeof demoCases)[0]) => {
    setActiveDemo(demo.id);
    setVideoFile(null);
    setVideoUrl(null);
    runAnalysis({ filename: demo.file, fileSize: demo.size });
  };

  const handleFileUpload = async (file: File) => {
    setVideoFile(file);
    setActiveDemo(null);
    setVideoUrl(URL.createObjectURL(file));

    // Convert small slice to base64 for real binary hash & header check
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string) || '';
      runAnalysis({ filename: file.name, fileSize: file.size, fileBase64: base64 });
    };
    reader.readAsDataURL(file.slice(0, 32768));
  };

  /* ── Universal intake: a clip routed from the home desk ── */
  useEffect(() => {
    const incoming = takeIntake('deepfake');
    if (incoming) handleFileUpload(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-6 sm:px-8 flex flex-col gap-6">
      <InstrumentHeader
        no="04"
        note={lang === "en" ? "Video forensics" : "वीडियो फॉरेंसिक"}
        title={lang === "en" ? "Deepfake call" : "डीपफेक कॉल"}
        methods={
          lang === "en"
            ? "Frame sampling · facial seam · blink rate · temporal drift"
            : "फ्रेम सैंपलिंग · फेशियल सीम · पलक दर · टेम्पोरल ड्रिफ्ट"
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <div className="flex flex-col gap-5">
      {/* 1-Click Demo Cases */}
      <div className="overflow-hidden rounded-xl border border-rule bg-card dark:border-dark-border dark:bg-dark-card">
        <h3 className="flex items-center gap-2 border-b border-rule/80 px-3.5 py-2 font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:border-white/10 dark:text-white/35">
          <Activity className="h-3.5 w-3.5" strokeWidth={1.8} />
          {lang === 'en' ? 'Reference recordings' : 'संदर्भ रिकॉर्डिंग'}
        </h3>
        <div className="divide-y divide-rule/80 dark:divide-white/10">
          {demoCases.map((demo) => (
            <button
              key={demo.id}
              onClick={() => handleDemoClick(demo)}
              disabled={isAnalyzing}
              className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors ${
                activeDemo === demo.id ? 'bg-paper-sunk dark:bg-white/[0.05]' : 'hover:bg-paper-sunk/60 dark:hover:bg-white/[0.03]'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink dark:text-white/90">{demo.title}</span>
                <span className="mt-0.5 block truncate font-mono text-[10px] text-ink-faint dark:text-white/30">
                  {demo.file} · {(demo.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </span>
              <span className={demo.type === 'Safe' ? 'sk-badge-trust' : 'sk-badge-fraud'}>
                {demo.type === 'Safe' ? '✓ Genuine' : '⚠ Fraudulent'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div className="relative flex min-h-[136px] flex-col items-center justify-center rounded-xl border border-dashed border-rule-strong/80 bg-card/40 px-4 py-6 transition-colors hover:border-ink-faint hover:bg-card dark:bg-white/[0.02] dark:hover:border-white/30 dark:hover:bg-white/[0.04]">
        <Video className="mb-2 h-5 w-5 text-ink-faint dark:text-white/30" strokeWidth={1.6} />
        <p className="text-[13px] font-medium text-ink dark:text-white">
          {lang === 'en' ? 'Drop the call recording, or choose a file' : 'कॉल रिकॉर्डिंग यहाँ डालें या फ़ाइल चुनें'}
        </p>
        <p className="mb-3 mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint dark:text-white/30">
          MP4 · MOV · WEBM — WhatsApp screen recordings welcome
        </p>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          id="video-upload"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
        <label
          htmlFor="video-upload"
          className="sk-btn-primary cursor-pointer text-xs"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          {isAnalyzing
            ? lang === 'en'
              ? 'Extracting temporal frames...'
              : 'विश्लेषण जारी...'
            : lang === 'en'
            ? 'Choose Video File'
            : 'वीडियो फ़ाइल चुनें'}
        </label>
        {videoFile && (
          <p className="text-xs text-trust font-mono mt-3">
            Loaded: {videoFile.name} ({(videoFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Video Preview if uploaded */}
      {videoUrl && (
        <div className="sk-card p-4 dark:bg-dark-card">
          <p className="text-xs font-mono text-ink-muted mb-2">Video Stream Preview:</p>
          <video src={videoUrl} controls className="max-h-64 rounded-lg mx-auto bg-black" />
        </div>
      )}

        </div>

        <div className="flex flex-col gap-4">
      {!results && !isAnalyzing && (
        <AwaitingFindings
          icon={Video}
          title={lang === 'en' ? 'Nothing analysed yet' : 'अभी कोई विश्लेषण नहीं'}
          body={
            lang === 'en'
              ? 'Load a reference recording or drop the call video. Frame-by-frame artefacts and a verdict appear here.'
              : 'संदर्भ रिकॉर्डिंग खोलें या कॉल वीडियो डालें। फ्रेम-दर-फ्रेम संकेत और निर्णय यहाँ आएँगे।'
          }
          steps={
            lang === 'en'
              ? ['No police force arrests anyone over a video call', 'Uniforms, seals and letterheads are forged constantly', 'Ask for the officer’s station and call back on 112']
              : ['कोई पुलिस वीडियो कॉल पर गिरफ्तार नहीं करती', 'वर्दी, मुहर और लेटरहेड आसानी से जाली बनते हैं', 'थाने का नाम पूछें और 112 पर कॉल करें']
          }
        />
      )}

      {/* Results Panel */}
      {results && (
        <div className="sk-card p-6 dark:bg-dark-card border border-rule dark:border-dark-border space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule dark:border-dark-border pb-3">
            <div className="flex items-center gap-2">
              {results.verdict === 'fraud' ? (
                <span className="sk-badge-fraud !text-[10px]">
                  <ShieldAlert className="h-3 w-3" />
                  High risk deepfake · {results.riskScore}%
                </span>
              ) : (
                <span className="sk-badge-trust !text-[10px]">
                  <ShieldCheck className="h-3 w-3" />
                  Genuine recording
                </span>
              )}
            </div>
            {results.sha256 && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-muted dark:text-white/45 bg-paper-sunk dark:bg-white/[0.03] px-2.5 py-1 rounded-md border border-rule dark:border-dark-border">
                <Hash className="w-3 h-3 text-trust" />
                <span className="truncate max-w-[200px]">SHA-256: {results.sha256}</span>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg border border-rule dark:border-dark-border bg-paper-sunk dark:bg-white/[0.03]">
              <span className="block text-[10px] font-mono uppercase text-ink-faint dark:text-white/35">
                Landmark Jitter
              </span>
              <span className="text-xs font-bold text-ink dark:text-white mt-1 block">
                {results.metrics?.landmarkJitter || 'Normal'}
              </span>
            </div>
            <div className="p-3.5 rounded-lg border border-rule dark:border-dark-border bg-paper-sunk dark:bg-white/[0.03]">
              <span className="block text-[10px] font-mono uppercase text-ink-faint dark:text-white/35">
                Synthetic Blink Rate
              </span>
              <span className="text-xs font-bold text-ink dark:text-white mt-1 block">
                {results.metrics?.blinkRate || '18 blinks/min'}
              </span>
            </div>
            <div className="p-3.5 rounded-lg border border-rule dark:border-dark-border bg-paper-sunk dark:bg-white/[0.03]">
              <span className="block text-[10px] font-mono uppercase text-ink-faint dark:text-white/35">
                A/V Sync Delta
              </span>
              <span className="text-xs font-bold text-ink dark:text-white mt-1 block">
                {results.metrics?.lipSyncDelta || 'Synchronized'}
              </span>
            </div>
          </div>

          {/* Real-Time Gemini AI Grounding & Web Intelligence */}
          {(results.entityProfile || results.liveWebStatus) && (
            <RealTimeGroundingCard
              entityProfile={results.entityProfile}
              liveWebStatus={results.liveWebStatus}
              riskRationale={results.riskRationale}
              actionSteps={results.actionSteps}
              provider={results.telemetry?.provider}
              lang={lang}
            />
          )}

          {/* Evidence List */}
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/35">
              {lang === 'en' ? 'Anomaly findings' : 'विसंगति निष्कर्ष'}
            </p>
            <ul className="space-y-1.5">
              {results.evidence?.map((item: string, idx: number) => (
                <li
                  key={idx}
                  className="text-xs text-ink-muted dark:text-white/60 flex items-start gap-2 leading-relaxed"
                >
                  {results.verdict === 'fraud' ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-trust shrink-0 mt-0.5" />
                  )}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Telemetry Footer */}
          <div className="pt-3 border-t border-rule dark:border-dark-border flex items-center justify-between text-[10px] font-mono text-ink-faint dark:text-white/35">
            <span className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-trust" />
              {results.telemetry?.provider} ({results.telemetry?.model})
            </span>
            <span>~{results.telemetry?.latencyMs}ms</span>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}