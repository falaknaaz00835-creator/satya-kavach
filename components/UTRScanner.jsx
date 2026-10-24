'use client';
import { useState } from 'react';

export default function UTRScanner() {
  const [utrInput, setUtrInput] = useState('');
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!utrInput) return;
    
    setIsScanning(true);
    setResult(null);

    try {
      // 1. Send the UTR securely to the Next.js server
      const response = await fetch('/api/verify-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: utrInput })
      });
      
      const data = await response.json();
      
      // 2. Format the API response for the UI
      setResult({
        status: data.riskLevel,
        riskScore: data.riskLevel === 'Dangerous' ? 95 : 10,
        reasons: data.reasons
      });
    } catch (error) {
      console.error('Scan failed:', error);
      setResult({
        status: 'Error',
        riskScore: 0,
        reasons: ['Failed to connect to the secure server.']
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl shadow-lg mt-8 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">🔢 UPI UTR Math Validator</h2>
      <p className="text-sm text-gray-400 mb-6">Mathematically verify 12-digit UTR numbers to expose fake payment receipts.</p>
      
      <form onSubmit={handleScan} className="flex gap-4 mb-6">
        <input 
          type="text" 
          value={utrInput}
          onChange={(e) => setUtrInput(e.target.value)}
          placeholder="Enter 12-digit UTR (e.g., 123456789012)..."
          className="flex-1 bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
        />
        <button 
          type="submit"
          disabled={isScanning}
          className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${
            isScanning ? 'bg-gray-600 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700'
          }`}
        >
          {isScanning ? 'Verifying...' : 'Validate UTR'}
        </button>
      </form>

      {result && (
        <div className={`p-4 rounded-lg border ${result.riskScore > 50 ? 'bg-red-900/30 border-red-500 text-red-300' : 'bg-green-900/30 border-green-500 text-green-300'}`}>
          <div className="flex justify-between items-center mb-2 font-bold">
            <span>Status: {result.status}</span>
            <span>Risk Score: {result.riskScore}/100</span>
          </div>
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