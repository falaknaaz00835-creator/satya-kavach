'use client';
import { useState } from 'react';
import { inspectScamLink } from '@/utils/linkInspector';

export default function LinkScanner() {
  const [urlInput, setUrlInput] = useState('');
  const [result, setResult] = useState(null);

  const handleInspect = (e) => {
    e.preventDefault();
    if (!urlInput) return;
    const analysis = inspectScamLink(urlInput);
    setResult(analysis);
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl shadow-lg mt-8 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">🔗 Phishing Link & Domain Sandbox</h2>
      <p className="text-sm text-gray-400 mb-6">Inspect suspicious SMS/WhatsApp links for fake government or banking domains.</p>
      
      <form onSubmit={handleInspect} className="flex gap-4 mb-6">
        <input 
          type="text" 
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste suspicious URL (e.g., https://sbi-update-kyc.xyz)..."
          className="flex-1 bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
        />
        <button 
          type="submit"
          className="px-6 py-3 bg-cyan-600 rounded-lg hover:bg-cyan-700 font-bold transition-all text-sm"
        >
          Analyze Link
        </button>
      </form>

      {result && (
        <div className={`p-4 rounded-lg border ${result.riskScore > 50 ? 'bg-red-900/30 border-red-500 text-red-300' : 'bg-green-900/30 border-green-500 text-green-300'}`}>
          <div className="flex justify-between items-center mb-2 font-bold">
            <span>Status: {result.status}</span>
            <span>Risk Score: {result.riskScore}/100</span>
          </div>
          <p className="text-xs font-mono text-gray-300 mb-2">Domain: {result.domain}</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            {result.reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}