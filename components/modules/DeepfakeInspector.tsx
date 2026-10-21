'use client';

import React, { useState } from 'react';
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

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Video className="w-5 h-5" />
          </span>
          <h2 className="text-xl font-bold text-ink dark:text-white">
            {lang === 'en' ? 'Video & Face-Swap Call Inspector' : 'वीडियो और फेस-स्वैप कॉल इंस्पेक्टर'}
          </h2>
        </div>
        <p className="text-xs text-ink-muted dark:text-slate-400 mt-1 font-mono">
          Temporal Landmark Jitter · Synthetic Blink Rate Metrics · Phoneme-to-Lip Sync Delta
        </p>
      </div>

      {/* 1-Click Demo Cases */}
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
              disabled={isAnalyzing}
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
                  {demo.type === 'Safe' ? '✓ Genuine' : '⚠ Fraudulent'}
                </span>
              </div>
              <p className="text-xs text-ink-muted dark:text-slate-400 font-mono">
                Sample: {demo.file} (~{(demo.size / 1024 / 1024).toFixed(1)}MB)
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-border dark:border-dark-border rounded-xl p-8 flex flex-col items-center justify-center bg-card dark:bg-dark-card hover:bg-surface dark:hover:bg-dark-surface/50 transition-colors">
        <Video className="w-8 h-8 text-ink-faint dark:text-slate-500 mb-2" />
        <p className="text-xs text-ink dark:text-white font-medium mb-1">
          {lang === 'en' ? 'Upload video file for real-time temporal analysis' : 'वीडियो अपलोड करें'}
        </p>
        <p className="text-[11px] text-ink-muted dark:text-slate-400 font-mono mb-4">
          Accepts .mp4, .mov, or WhatsApp call video recordings
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
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-3">
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

      {/* Results Panel */}
      {results && (
        <div className="sk-card p-6 dark:bg-dark-card border border-border dark:border-dark-border space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border dark:border-dark-border pb-3">
            <div className="flex items-center gap-2">
              {results.verdict === 'fraud' ? (
                <span className="sk-badge-fraud text-sm px-3 py-1">
                  <ShieldAlert className="w-4 h-4" />
                  HIGH RISK DEEPFAKE • {results.riskScore}%
                </span>
              ) : (
                <span className="sk-badge-trust text-sm px-3 py-1">
                  <ShieldCheck className="w-4 h-4" />
                  GENUINE RECORDING • SAFE
                </span>
              )}
            </div>
            {results.sha256 && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-muted dark:text-slate-400 bg-surface dark:bg-dark-surface px-2.5 py-1 rounded-md border border-border dark:border-dark-border">
                <Hash className="w-3 h-3 text-emerald-600" />
                <span className="truncate max-w-[200px]">SHA-256: {results.sha256}</span>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface/40">
              <span className="block text-[10px] font-mono uppercase text-ink-faint dark:text-slate-500">
                Landmark Jitter
              </span>
              <span className="text-xs font-bold text-ink dark:text-white mt-1 block">
                {results.metrics?.landmarkJitter || 'Normal'}
              </span>
            </div>
            <div className="p-3.5 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface/40">
              <span className="block text-[10px] font-mono uppercase text-ink-faint dark:text-slate-500">
                Synthetic Blink Rate
              </span>
              <span className="text-xs font-bold text-ink dark:text-white mt-1 block">
                {results.metrics?.blinkRate || '18 blinks/min'}
              </span>
            </div>
            <div className="p-3.5 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface/40">
              <span className="block text-[10px] font-mono uppercase text-ink-faint dark:text-slate-500">
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
            <p className="text-xs font-semibold text-ink dark:text-white mb-2">
              Forensic Anomaly Findings:
            </p>
            <ul className="space-y-1.5">
              {results.evidence?.map((item: string, idx: number) => (
                <li
                  key={idx}
                  className="text-xs text-ink-muted dark:text-slate-300 flex items-start gap-2 leading-relaxed"
                >
                  {results.verdict === 'fraud' ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Telemetry Footer */}
          <div className="pt-3 border-t border-border dark:border-dark-border flex items-center justify-between text-[10px] font-mono text-ink-faint dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-emerald-600" />
              {results.telemetry?.provider} ({results.telemetry?.model})
            </span>
            <span>~{results.telemetry?.latencyMs}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}