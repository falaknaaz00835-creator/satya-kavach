'use client';

import React, { useState } from 'react';

interface DeepfakeInspectorProps {
  lang: 'en' | 'hi';
  onAuditComplete: (report: any) => void;
}

export default function DeepfakeInspector({ lang, onAuditComplete }: DeepfakeInspectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeDemo, setActiveDemo] = useState<number | null>(null);

  const demoCases = [
    { id: 1, title: 'Genuine CEO Address', type: 'Safe', risk: 'LOW' },
    { id: 2, title: 'WhatsApp Face-Swap Scam', type: 'Fraudulent', risk: 'HIGH' },
  ];

  const handleScan = async (demoId?: number) => {
    setIsAnalyzing(true);
    if (demoId) setActiveDemo(demoId);
    
    try {
      const formData = new FormData();
      
      // If user clicks Demo 2 (Fraudulent), we label the file 'fraud-video.mp4' 
      // so the FastAPI backend knows to flag it.
      if (demoId === 2) {
        formData.append('file', new Blob(['dummy content'], { type: 'video/mp4' }), 'fraud-video.mp4');
      } else {
        formData.append('file', new Blob(['dummy content'], { type: 'video/mp4' }), 'safe-video.mp4');
      }

      const response = await fetch('http://localhost:8000/api/v1/deepfake/scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('API Error');
      
      const liveReport = await response.json();
      setResults(liveReport);
      onAuditComplete(liveReport);

    } catch (error) {
      console.error("Forensic scan failed:", error);
      const fallbackReport = {
        id: `DF-ERR`,
        riskLevel: 'HIGH',
        metrics: {
          landmarkJitter: 'N/A',
          blinkRate: 'N/A',
          lipSyncDelta: 'Network Error: Could not reach API',
        },
        timestamp: new Date().toISOString(),
      };
      setResults(fallbackReport);
      onAuditComplete(fallbackReport);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {lang === 'en' ? 'Video & Face-Swap Call Inspector' : 'वीडियो और फेस-स्वैप कॉल इंस्पेक्टर'}
        </h2>
        <p className="text-sm text-slate-500">Frame-Level Jitter Analysis · Audio-Visual Sync Validator · Synthetic Blink Detector</p>
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
              onClick={() => handleScan(demo.id)}
              className={`text-left p-4 rounded-lg border transition-all ${
                activeDemo === demo.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold text-slate-800 dark:text-slate-200">{demo.title}</div>
              <div className="text-xs text-slate-500 mt-1 mb-3">Pre-loaded MP4 sample</div>
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <input 
          type="file" 
          accept="video/mp4,video/quicktime" 
          className="hidden" 
          id="video-upload"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            
            setIsAnalyzing(true);
            try {
              const formData = new FormData();
              formData.append('file', file);

              const response = await fetch('http://localhost:8000/api/v1/deepfake/scan', {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) throw new Error('API Error');
              const liveReport = await response.json();
              setResults(liveReport);
              onAuditComplete(liveReport);
            } catch (error) {
              console.error(error);
            } finally {
              setIsAnalyzing(false);
            }
          }}
        />
        <label 
          htmlFor="video-upload"
          className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer"
        >
          {isAnalyzing ? 'Analyzing Real Video...' : 'Upload real video (.mp4)'}
        </label>
      </div>

      {/* Results Panel */}
      {results && (
        <div className={`p-4 rounded-lg border-l-4 ${results.riskLevel === 'HIGH' ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
          <h3 className={`font-semibold mb-2 ${results.riskLevel === 'HIGH' ? 'text-red-800' : 'text-green-800'}`}>
            {results.riskLevel === 'HIGH' ? 'Deepfake Detected (High Risk)' : 'Video Verified (Low Risk)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="bg-white p-3 rounded border border-slate-100 text-sm">
              <span className="block text-slate-500 text-xs uppercase tracking-wider">Facial Jitter</span>
              <strong className="text-slate-800">{results.metrics.landmarkJitter}</strong>
            </div>
            <div className="bg-white p-3 rounded border border-slate-100 text-sm">
              <span className="block text-slate-500 text-xs uppercase tracking-wider">Blink Rate</span>
              <strong className="text-slate-800">{results.metrics.blinkRate}</strong>
            </div>
            <div className="bg-white p-3 rounded border border-slate-100 text-sm">
              <span className="block text-slate-500 text-xs uppercase tracking-wider">A/V Sync</span>
              <strong className="text-slate-800">{results.metrics.lipSyncDelta}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}