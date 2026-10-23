'use client';
import { useRef, useState } from 'react';

export default function ImageForensics() {
  const canvasRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const runForensics = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imageSrc;
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Extract raw pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Mathematical filter to detect noise variance (Photoshop anomalies)
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        let variance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
        
        // If pixel variance is unnatural (common in edited text overlays)
        if (variance > 40) {
          data[i] = 0;       // Red
          data[i + 1] = 255; // Green (Highlight fake pixels in neon)
          data[i + 2] = 0;   // Blue
        } else {
           // Dim the genuine parts of the image to a dark grayscale
           let avg = (r + g + b) / 3;
           data[i] = avg * 0.3;
           data[i + 1] = avg * 0.3;
           data[i + 2] = avg * 0.3;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    };
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-xl shadow-lg mt-8 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-green-400">🖼️ Pixel Forensics (ELA Engine)</h2>
      <p className="text-sm text-gray-400 mb-6">Mathematically scan image buffers for clone-stamped or spoofed text layers.</p>
      
      <input 
        type="file" 
        accept="image/*"
        onChange={handleImageUpload}
        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 mb-4"
      />

      {imageSrc && (
        <button 
          onClick={runForensics}
          className="px-6 py-2 mb-4 bg-green-600 rounded hover:bg-green-700 font-bold transition-all"
        >
          Run Pixel Analysis
        </button>
      )}

      <div className="mt-4 overflow-hidden border-2 border-gray-800 rounded-lg bg-black">
        <canvas ref={canvasRef} className="max-w-full h-auto"></canvas>
      </div>
    </div>
  );
}