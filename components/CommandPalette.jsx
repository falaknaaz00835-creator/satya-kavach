'use client';
import { useState, useEffect } from 'react';

export default function CommandPalette({ setActiveModule }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24">
      <div className="bg-gray-900 border border-cyan-500/50 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden p-4 text-white">
        <div className="text-xs font-mono text-cyan-400 mb-2">SATYA-KAVACH COMMAND MATRIX [v2.4]</div>
        <input 
          autoFocus
          placeholder="Type a command (e.g., Scan Audio, Verify UTR, Pixel ELA)..."
          className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
        />
        <div className="mt-4 space-y-1">
          <div onClick={() => { setActiveModule('audio'); setIsOpen(false); }} className="p-2 hover:bg-cyan-950/40 rounded cursor-pointer flex justify-between items-center text-sm">
            <span>🎙️ Launch Audio Deepfake Forensics</span>
            <span className="text-xs font-mono text-gray-500">Ctrl+1</span>
          </div>
          <div onClick={() => { setActiveModule('forensics'); setIsOpen(false); }} className="p-2 hover:bg-cyan-950/40 rounded cursor-pointer flex justify-between items-center text-sm">
            <span>🖼️ Run Pixel Error Level Analysis</span>
            <span className="text-xs font-mono text-gray-500">Ctrl+2</span>
          </div>
          <div onClick={() => { setActiveModule('fir'); setIsOpen(false); }} className="p-2 hover:bg-cyan-950/40 rounded cursor-pointer flex justify-between items-center text-sm">
            <span>⚖️ Generate BSA 2023 Crypto Dossier</span>
            <span className="text-xs font-mono text-gray-500">Ctrl+3</span>
          </div>
        </div>
      </div>
    </div>
  );
}