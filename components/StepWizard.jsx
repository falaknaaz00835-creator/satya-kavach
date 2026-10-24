'use client';
import { useState } from 'react';

export default function StepWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [inputData, setInputData] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDeterministicAnalysis = async () => {
    setIsLoading(true);
    
    try {
      // Automatically route to the correct secure backend API
      if (inputData.length === 12 && !isNaN(inputData)) {
        const response = await fetch('/api/verify-utr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ utr: inputData })
        });
        const res = await response.json();
        setScanResult({ type: 'UTR', status: res.riskLevel, reason: res.reasons[0] });
      } 
      else if (inputData.startsWith('http')) {
        const response = await fetch('/api/analyze-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputData })
        });
        const res = await response.json();
        setScanResult({ type: 'LINK', status: res.riskLevel, reason: res.reasons[0] });
      } 
      else {
        setScanResult({ type: 'UNKNOWN', status: 'Error', reason: 'Invalid input format. Enter 12-digit UTR or URL.' });
      }
      setCurrentStep(2);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDossier = async () => {
    setIsLoading(true);
    
    try {
      // 1. Generate client hash representation
      const clientHash = btoa(inputData || "artifact").substring(0, 32);

      // 2. Fetch secure server timestamp and signature
      const response = await fetch('/api/generate-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientHash: clientHash,
          artifactType: scanResult?.type || 'Digital_Evidence' 
        })
      });
      
      const data = await response.json();
      setDossier(data);
      setCurrentStep(3);
    } catch (error) {
      console.error('Dossier generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl shadow-lg mt-8 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">🛡️ Enterprise Forensic Workflow</h2>
      
      {/* Step Indicator Tabs */}
      <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
        <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}>
          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">1</span>
          <span>Input Artifact</span>
        </div>
        <div className={`flex-1 border-t ${currentStep >= 2 ? 'border-cyan-400' : 'border-gray-800'} mx-4`}></div>
        <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}>
          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">2</span>
          <span>Deterministic Scan</span>
        </div>
        <div className={`flex-1 border-t ${currentStep === 3 ? 'border-cyan-400' : 'border-gray-800'} mx-4`}></div>
        <div className={`flex items-center space-x-2 ${currentStep === 3 ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}>
          <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">3</span>
          <span>BSA 2023 Dossier</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-6 bg-black/40 p-4 rounded-lg border border-gray-800 min-h-[140px] flex flex-col justify-center">
        {currentStep === 1 && (
          <div>
            <p className="text-gray-300 text-sm mb-3">Step 1: Enter a 12-digit UTR number or a suspicious URL to scan.</p>
            <input 
              type="text"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="Paste UTR or URL here..."
              className="w-full bg-black/60 border border-gray-700 rounded p-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {currentStep === 2 && scanResult && (
          <div className="space-y-2 font-mono text-sm">
            <div className="text-cyan-400 font-bold">🔍 Server Execution Results:</div>
            <div className="text-gray-300">Artifact Type: {scanResult.type}</div>
            <div className={scanResult.status === 'Dangerous' || scanResult.status === 'Error' ? 'text-red-400' : 'text-green-400'}>
              Verdict: {scanResult.status}
            </div>
            <div className="text-gray-400 text-xs mt-2 border-t border-gray-800 pt-2">
              Reason: {scanResult.reason}
            </div>
          </div>
        )}

        {currentStep === 3 && dossier && (
          <div className="text-center space-y-3">
            <p className="text-green-400 font-bold text-lg">✅ Legally Certified</p>
            <div className="bg-black/60 p-3 rounded border border-gray-700 font-mono text-xs text-left break-all">
              <span className="text-cyan-400">Server Hash:</span> {dossier.certifiedHash}<br/>
              <span className="text-cyan-400">Timestamp:</span> {dossier.timestamp}
            </div>
            <p className="text-xs text-gray-400">{dossier.legalDisclaimer}</p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button 
          onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
          disabled={currentStep === 1 || isLoading}
          className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 text-sm font-bold"
        >
          Back
        </button>

        {currentStep === 1 && (
          <button 
            onClick={runDeterministicAnalysis}
            disabled={!inputData || isLoading}
            className="px-6 py-2 bg-cyan-600 rounded hover:bg-cyan-700 disabled:opacity-30 text-sm font-bold"
          >
            {isLoading ? 'Scanning...' : 'Run Scan (Step 2)'}
          </button>
        )}
        
        {currentStep === 2 && (
          <button 
            onClick={handleGenerateDossier}
            disabled={isLoading}
            className="px-6 py-2 bg-cyan-600 rounded hover:bg-cyan-700 disabled:opacity-30 text-sm font-bold"
          >
            {isLoading ? 'Securing...' : 'Generate Legal Dossier'}
          </button>
        )}

        {currentStep === 3 && (
          <button 
            onClick={() => { setCurrentStep(1); setInputData(''); }}
            className="px-6 py-2 bg-green-600 rounded hover:bg-green-700 text-sm font-bold"
          >
            Start New Scan
          </button>
        )}
      </div>
    </div>
  );
}