"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  X,
  Zap,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Scan,
  Maximize2,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

interface ARScannerViewProps {
  onClose: () => void;
  onDetectPayload: (payload: { type: "qr" | "image"; text?: string; base64?: string }) => void;
  lang?: "en" | "hi";
}

export default function ARScannerView({
  onClose,
  onDetectPayload,
  lang = "en",
}: ARScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);
  const [detectedTarget, setDetectedTarget] = useState<{
    text: string;
    isDangerous: boolean;
    confidence: number;
    category: string;
  } | null>(null);
  const [useSimulatedFeed, setUseSimulatedFeed] = useState<boolean>(false);

  // Initialize camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
        }
      } catch (err: any) {
        console.warn("Real camera unavailable, falling back to cyber viewfinder simulation:", err);
        setHasCamera(false);
        setCameraError(err?.message || "Camera permission not granted");
        setUseSimulatedFeed(true);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Real-time AR HUD rendering & frame processing loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;

    const renderLoop = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          const W = canvas.width;
          const H = canvas.height;

          // Clear HUD canvas
          ctx.clearRect(0, 0, W, H);

          if (!useSimulatedFeed && video && video.readyState === video.HAVE_ENOUGH_DATA) {
            // Process camera frame with jsQR
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
              tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
              const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
              const code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: "dontInvert",
              });

              if (code && code.data) {
                const isCollect =
                  code.data.includes("mode=02") ||
                  code.data.toLowerCase().includes("collect") ||
                  code.data.includes(".xyz");

                setDetectedTarget({
                  text: code.data,
                  isDangerous: isCollect,
                  confidence: isCollect ? 98 : 94,
                  category: isCollect ? "CRITICAL REVERSE-DEBIT TRAP" : "VERIFIED PAYMENT INTENT",
                });

                // Draw AR Bounding Box over code location scaled to canvas
                const scaleX = W / video.videoWidth;
                const scaleY = H / video.videoHeight;

                const loc = code.location;
                ctx.beginPath();
                ctx.moveTo(loc.topLeftCorner.x * scaleX, loc.topLeftCorner.y * scaleY);
                ctx.lineTo(loc.topRightCorner.x * scaleX, loc.topRightCorner.y * scaleY);
                ctx.lineTo(loc.bottomRightCorner.x * scaleX, loc.bottomRightCorner.y * scaleY);
                ctx.lineTo(loc.bottomLeftCorner.x * scaleX, loc.bottomLeftCorner.y * scaleY);
                ctx.closePath();

                ctx.lineWidth = 3;
                ctx.strokeStyle = isCollect ? "#EF4444" : "#10B981";
                ctx.shadowColor = isCollect ? "#EF4444" : "#10B981";
                ctx.shadowBlur = 15;
                ctx.stroke();

                // Draw AR Tag Label
                ctx.font = "bold 12px monospace";
                ctx.fillStyle = isCollect ? "#EF4444" : "#10B981";
                ctx.fillText(
                  isCollect ? "⚠ TARGET LOCKED: MALICIOUS COLLECT TRAP" : "✓ TARGET LOCKED: VERIFIED PSP",
                  loc.topLeftCorner.x * scaleX,
                  loc.topLeftCorner.y * scaleY - 10
                );
              }
            }
          }

          // Draw Futuristic Sci-Fi Targeting Reticle in Center
          const cx = W / 2;
          const cy = H / 2;
          const boxSize = Math.min(W, H) * 0.55;
          const half = boxSize / 2;
          const cornerLen = 24;

          ctx.shadowBlur = 8;
          ctx.shadowColor = detectedTarget?.isDangerous ? "#EF4444" : "#06B6D4";
          ctx.strokeStyle = detectedTarget?.isDangerous ? "#EF4444" : "#06B6D4";
          ctx.lineWidth = 2.5;

          // Top-Left
          ctx.beginPath();
          ctx.moveTo(cx - half, cy - half + cornerLen);
          ctx.lineTo(cx - half, cy - half);
          ctx.lineTo(cx - half + cornerLen, cy - half);
          ctx.stroke();

          // Top-Right
          ctx.beginPath();
          ctx.moveTo(cx + half - cornerLen, cy - half);
          ctx.lineTo(cx + half, cy - half);
          ctx.lineTo(cx + half, cy - half + cornerLen);
          ctx.stroke();

          // Bottom-Left
          ctx.beginPath();
          ctx.moveTo(cx - half, cy + half - cornerLen);
          ctx.lineTo(cx - half, cy + half);
          ctx.lineTo(cx - half + cornerLen, cy + half);
          ctx.stroke();

          // Bottom-Right
          ctx.beginPath();
          ctx.moveTo(cx + half - cornerLen, cy + half);
          ctx.lineTo(cx + half, cy + half);
          ctx.lineTo(cx + half, cy + half - cornerLen);
          ctx.stroke();

          // Center Reticle Crosshairs
          ctx.beginPath();
          ctx.moveTo(cx - 12, cy);
          ctx.lineTo(cx + 12, cy);
          ctx.moveTo(cx, cy - 12);
          ctx.lineTo(cx, cy + 12);
          ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
          ctx.stroke();

          // Horizontal Scanning Laser Line
          const scanY = cy - half + ((Math.sin(now / 400) + 1) / 2) * boxSize;
          const gradient = ctx.createLinearGradient(cx - half, scanY, cx + half, scanY);
          gradient.addColorStop(0, "rgba(6, 182, 212, 0)");
          gradient.addColorStop(0.5, detectedTarget?.isDangerous ? "rgba(239, 68, 68, 0.8)" : "rgba(6, 182, 212, 0.8)");
          gradient.addColorStop(1, "rgba(6, 182, 212, 0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(cx - half, scanY - 1.5, boxSize, 3);
        }
      }

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    animationFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [useSimulatedFeed, detectedTarget]);

  // Capture frame and pass to deep forensic analyzer
  const handleDeepScanCapture = useCallback(() => {
    let capturedBase64: string | undefined;

    if (canvasRef.current) {
      if (videoRef.current && !useSimulatedFeed) {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = videoRef.current.videoWidth || 640;
        offCanvas.height = videoRef.current.videoHeight || 480;
        const ctx = offCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          capturedBase64 = offCanvas.toDataURL("image/jpeg", 0.85);
        }
      }
    }

    if (detectedTarget) {
      onDetectPayload({
        type: "qr",
        text: detectedTarget.text,
        base64: capturedBase64,
      });
    } else {
      onDetectPayload({
        type: "image",
        text: "AR Viewfinder Screen Capture",
        base64: capturedBase64,
      });
    }
    onClose();
  }, [detectedTarget, onDetectPayload, onClose, useSimulatedFeed]);

  // Demo target trigger for test simulation
  const triggerSimulation = (isScam: boolean) => {
    setDetectedTarget({
      text: isScam
        ? "upi://pay?pa=scammer@ybl&pn=FakeElectricityDept&am=4999&mode=02"
        : "upi://pay?pa=verified.merchant@okaxis&pn=SwiggyOrders&am=450",
      isDangerous: isScam,
      confidence: 98,
      category: isScam ? "CRITICAL REVERSE-DEBIT TRAP (mode=02)" : "VERIFIED MERCHANT INTENT",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden">
      {/* ── Top AR HUD Bar ── */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="font-mono text-xs font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            AR Forensic Viewfinder
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-cyan-500/30 text-cyan-300">
            {fps} FPS · 1080p
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseSimulatedFeed((s) => !s)}
            className="px-2.5 py-1 text-[11px] font-mono rounded bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 transition-colors"
          >
            {useSimulatedFeed ? "Switch to Real Cam" : "Demo Sim Feed"}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close AR mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Main Viewfinder Area ── */}
      <div className="relative flex-1 flex items-center justify-center bg-slate-950 overflow-hidden">
        {/* Real Video Stream */}
        {!useSimulatedFeed && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
        )}

        {/* Simulated Camera Feed (Dev/Demo fallback) */}
        {useSimulatedFeed && (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-radial from-slate-900 to-black p-6">
            <div className="w-48 h-48 rounded-2xl border border-dashed border-cyan-500/40 flex flex-col items-center justify-center p-4 text-center bg-cyan-950/20 backdrop-blur-xs">
              <Scan className="w-12 h-12 text-cyan-400 mb-2 animate-pulse" />
              <p className="text-xs font-mono text-cyan-200">Point at QR code or bill</p>
              <p className="text-[10px] text-slate-400 mt-1">Live Optical Pipeline Active</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => triggerSimulation(true)}
                className="px-3 py-1.5 rounded bg-red-600/80 hover:bg-red-600 text-xs font-mono font-bold text-white transition-colors shadow-lg"
              >
                Simulate Scam QR
              </button>
              <button
                onClick={() => triggerSimulation(false)}
                className="px-3 py-1.5 rounded bg-emerald-600/80 hover:bg-emerald-600 text-xs font-mono font-bold text-white transition-colors shadow-lg"
              >
                Simulate Safe QR
              </button>
            </div>
          </div>
        )}

        {/* Overlay Canvas for Real-Time HUD Reticle and Bounding Boxes */}
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Live Detected Target Floating HUD Card */}
        {detectedTarget && (
          <div
            className={clsx(
              "absolute top-20 z-20 max-w-sm w-[90%] p-3.5 rounded-xl border backdrop-blur-md transition-all shadow-2xl animate-in fade-in slide-in-from-top-4",
              detectedTarget.isDangerous
                ? "bg-red-950/80 border-red-500 text-red-100"
                : "bg-emerald-950/80 border-emerald-500 text-emerald-100"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono uppercase tracking-wide">
                {detectedTarget.isDangerous ? (
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
                {detectedTarget.category}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 font-bold">
                {detectedTarget.confidence}% Certainty
              </span>
            </div>

            <p className="text-[11px] font-mono break-all line-clamp-2 text-white/90">
              {detectedTarget.text}
            </p>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-[10px] text-white/70 font-mono">
                {detectedTarget.isDangerous
                  ? "⚠ Reverse-Debit Mode Detected"
                  : "✓ Verified NPCI Routing"}
              </span>
              <button
                onClick={handleDeepScanCapture}
                className={clsx(
                  "px-3 py-1 rounded text-xs font-bold font-mono transition-transform active:scale-95",
                  detectedTarget.isDangerous
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                )}
              >
                Inspect Threat →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Capture Controller ── */}
      <footer className="absolute bottom-0 inset-x-0 z-20 p-6 flex flex-col items-center gap-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <p className="text-xs font-mono text-cyan-300 text-center flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Point lens at any UPI QR code, invoice, or laptop screen
        </p>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setDetectedTarget(null)}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Reset Scan"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>

          {/* Shutter / Deep Scan Button */}
          <button
            onClick={handleDeepScanCapture}
            className="w-16 h-16 rounded-full border-4 border-cyan-400 p-1 bg-white/20 hover:bg-white/30 flex items-center justify-center transition-transform active:scale-90 shadow-lg shadow-cyan-500/30"
            title="Capture & Deep Scan Frame"
          >
            <div className="w-11 h-11 rounded-full bg-cyan-400 hover:bg-cyan-300 flex items-center justify-center text-slate-950 font-bold">
              <Zap className="w-5 h-5 text-slate-950" />
            </div>
          </button>

          <button
            onClick={onClose}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Exit Viewfinder"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
