'use client';
import { useState, useEffect } from 'react';

const mockAlerts = [
  "🚨 [ALERT] Blocked synthetic voice clone attempt in Mathura region (Confidence: 96.8%)",
  "⚡ [SYSTEM] UTR cryptographic mismatch detected on spoofed payment receipt",
  "🔒 [SECURITY] SHA-256 evidence hash generated under Section 63 BSA 2023 standards",
  "🛡️ [GATEWAY] Live WhatsApp webhook processed 1,420 automated fraud triage requests today",
  "🟢 [STATUS] FastAPI Render microservice operational - Zero downtime recorded"
];

// Web Audio API synthesizer for a clean, futuristic pulse sound
function playSciFiBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime); // Deeper terminal tone (320Hz)
    
    gain.gain.setValueAtTime(0.03, ctx.currentTime); // Adjusted volume level
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2); // Slightly longer fade out
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Ignore browser autoplay restrictions before user interaction
  }
}

export default function ThreatTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % mockAlerts.length;
        playSciFiBeep(); // Trigger subtle futuristic pulse on alert change
        return nextIndex;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-cyan-950/40 border-b border-cyan-500/30 py-2 px-4 flex items-center justify-between text-xs font-mono text-cyan-400 overflow-hidden">
      <div className="flex items-center space-x-2 animate-pulse shrink-0">
        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
        <span className="font-bold">THREAT INTELLIGENCE FEED:</span>
      </div>
      <div className="truncate mx-4 text-gray-300 transition-all duration-500">
        {mockAlerts[currentIndex]}
      </div>
      <div className="shrink-0 text-gray-500">
        SECURE // ENCRYPTED
      </div>
    </div>
  );
}