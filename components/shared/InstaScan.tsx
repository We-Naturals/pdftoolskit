import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Camera,
    Zap,
    ShieldCheck,
    X,
    FileText,
    CheckCircle2
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { webGpuVisionEngine } from '@/lib/engines/webgpu-vision';
import { liveIntelligence, LiveIntelligenceResult } from '@/lib/engines/live-intelligence';
import { cn } from '@/lib/utils';

export function InstaScan() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const gpuCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

    const [streaming, setStreaming] = useState(false);
    const [capturedPages, setCapturedPages] = useState<string[]>([]);
    const [mode, setMode] = useState<'edge' | 'binarize'>('edge');
    const [intelResults, setIntelResults] = useState<LiveIntelligenceResult[]>([]);
    const [isLocked, setIsLocked] = useState(false);
    const [scanPos, setScanPos] = useState(0);
    const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);

    // WebGPU Vision Loop
    useEffect(() => {
        if (!streaming) return;

        let animationId: number;
        let lastQuad: { x: number, y: number }[] | null = null;
        let lockTimer = 0;
        let autoCaptureTimer = 0;

        const renderLoop = async () => {
            if (videoRef.current && gpuCanvasRef.current) {
                // 1. Process Frame with WebGPU
                await webGpuVisionEngine.processFrame(videoRef.current, gpuCanvasRef.current, mode);

                // 2. Perform Geometric Quad Detection
                const quad = await webGpuVisionEngine.findQuad(videoRef.current);

                // 3. Update Scan Line (0 to 1 loop)
                setScanPos(prev => (prev + 0.01) % 1);

                // 4. Check Quad Stability (Lock Logic)
                if (quad && lastQuad) {
                    const diff = quad.reduce((acc, p, i) => acc + Math.abs(p.x - lastQuad![i].x) + Math.abs(p.y - lastQuad![i].y), 0);
                    if (diff < 0.04) { // Tightened for "Apex" precision
                        lockTimer += 16;
                        if (lockTimer > 500 && !isLocked) {
                            setIsLocked(true);
                            if ('vibrate' in navigator) navigator.vibrate(40);
                        }

                        // Auto-Capture Logic
                        if (isLocked && autoCaptureEnabled) {
                            autoCaptureTimer += 16;
                            if (autoCaptureTimer > 1200) {
                                triggerCapture();
                                autoCaptureTimer = 0;
                            }
                        }
                    } else {
                        lockTimer = 0;
                        autoCaptureTimer = 0;
                        setIsLocked(false);
                    }
                } else if (!quad) {
                    setIsLocked(false);
                    lockTimer = 0;
                    autoCaptureTimer = 0;
                }
                lastQuad = quad;

                // 5. Render Overlay
                renderOverlay(quad, intelResults, isLocked, scanPos);
            }
            animationId = requestAnimationFrame(renderLoop);
        };

        webGpuVisionEngine.init().then(() => {
            animationId = requestAnimationFrame(renderLoop);
        });

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            webGpuVisionEngine.destroy();
        };
    }, [streaming, mode, intelResults, isLocked, autoCaptureEnabled]);

    // Throttled Intelligence Sampling Loop
    useEffect(() => {
        if (!streaming) return;

        const intelLoop = setInterval(async () => {
            if (gpuCanvasRef.current) {
                const results = await liveIntelligence.sample(gpuCanvasRef.current);
                setIntelResults([...results]);
            }
        }, 500);

        return () => clearInterval(intelLoop);
    }, [streaming]);

    const renderOverlay = (quad: { x: number, y: number }[] | null, intel: LiveIntelligenceResult[], locked: boolean, sPos: number) => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = canvas.width;
        const h = canvas.height;

        // 1. Render Scan Line Sweep
        if (streaming) {
            const gradient = ctx.createLinearGradient(0, sPos * h - 50, 0, sPos * h);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
            gradient.addColorStop(1, 'rgba(56, 189, 248, 0.3)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, sPos * h - 100, w, 100);

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, sPos * h);
            ctx.lineTo(w, sPos * h);
            ctx.stroke();
        }

        // 2. Render Quad Frame & Reticles
        if (quad) {
            const color = locked ? '#10b981' : '#3b82f6';
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(quad[0].x * w, quad[0].y * h);
            quad.forEach(p => ctx.lineTo(p.x * w, p.y * h));
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = locked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.05)';
            ctx.fill();

            // Corner Reticles
            quad.forEach(p => {
                const px = p.x * w;
                const py = p.y * h;
                const size = 12;
                ctx.beginPath();
                ctx.moveTo(px - size, py); ctx.lineTo(px + size, py);
                ctx.moveTo(px, py - size); ctx.lineTo(px, py + size);
                ctx.stroke();
            });
        }

        // 3. Render Live Intelligence
        intel.forEach(res => {
            const { x, y, w: bw, h: bh } = res.normalizedBox;
            const px = x * w;
            const py = y * h;
            const pw = bw * w;
            const ph = bh * h;

            ctx.fillStyle = res.isPII ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.75)';
            ctx.beginPath();
            ctx.roundRect(px, py, pw, ph, 4);
            ctx.fill();

            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(res.text, px + 8, py + (ph / 2) + 4);
        });
    };

    const triggerCapture = async () => {
        if (!gpuCanvasRef.current) return;
        if ('vibrate' in navigator) navigator.vibrate([20, 50, 20]);

        // 1. Detect latest quad for dewarping
        const quad = await webGpuVisionEngine.findQuad(videoRef.current!);

        // 2. Execute GPU Dewarp if quad exists
        let finalUrl: string;
        if (quad) {
            finalUrl = await webGpuVisionEngine.dewarp(gpuCanvasRef.current, quad);
        } else {
            finalUrl = gpuCanvasRef.current.toDataURL('image/png');
        }

        setCapturedPages(prev => [...prev, finalUrl]);
        toast.success('Page ' + (capturedPages.length + 1) + ' Captured & Dewarped');
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setStreaming(true);
            }
        } catch (err) {
            console.error(err);
            toast.error('Camera access denied');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            setStreaming(false);
            setIsLocked(false);
        }
    };

    const proceedToOcr = () => {
        if (capturedPages.length > 0) {
            // For now, project supports single file processing in OCR, but we store the batch
            sessionStorage.setItem('last_scan_batch', JSON.stringify(capturedPages));
            sessionStorage.setItem('last_scan_capture', capturedPages[0]);
            router.push('/ocr-pdf');
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto p-4">
            <GlassCard className="w-full relative overflow-hidden bg-black aspect-video rounded-[2.5rem] border-2 border-slate-800/50 shadow-2xl">
                {!streaming ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="p-8 bg-blue-500/10 rounded-full animate-pulse border border-blue-500/20">
                            <Camera className="w-16 h-16 text-blue-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Insta-Scan Apex</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">v2.0 Hyper-Vision</p>
                        </div>
                        <Button onClick={startCamera} variant="primary" className="mt-4 ring-8 ring-blue-500/10 px-10 py-7 font-black text-sm uppercase tracking-widest">
                            Engage Neural Link
                        </Button>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay playsInline className="hidden" onLoadedMetadata={() => {
                            if (videoRef.current && gpuCanvasRef.current && overlayCanvasRef.current) {
                                const { videoWidth, videoHeight } = videoRef.current;
                                gpuCanvasRef.current.width = videoWidth; gpuCanvasRef.current.height = videoHeight;
                                overlayCanvasRef.current.width = videoWidth; overlayCanvasRef.current.height = videoHeight;
                            }
                        }} />
                        <canvas ref={gpuCanvasRef} className="w-full h-full object-cover" />
                        <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

                        {/* Apex HUD */}
                        <div className="absolute top-8 left-8 flex flex-col gap-2">
                            <div className="flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-3xl rounded-xl border border-white/10">
                                <Zap className={cn("w-4 h-4 transition-colors duration-500", isLocked ? "text-emerald-400" : "text-blue-400")} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                    {isLocked ? "TARGET LOCKED" : "SCANNING FOR EDGES"}
                                </span>
                            </div>
                            <button
                                onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all",
                                    autoCaptureEnabled ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-white/40"
                                )}
                            >
                                <div className={cn("w-1.5 h-1.5 rounded-full", autoCaptureEnabled ? "bg-emerald-400 animate-pulse" : "bg-white/20")} />
                                Auto-Capture: {autoCaptureEnabled ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="absolute top-8 right-8 flex gap-3">
                            <div className="flex bg-black/60 backdrop-blur-2xl p-1 rounded-xl border border-white/10">
                                <button onClick={() => setMode('edge')} className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", mode === 'edge' ? "bg-blue-600 text-white" : "text-white/40")}>Edge</button>
                                <button onClick={() => setMode('binarize')} className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", mode === 'binarize' ? "bg-blue-600 text-white" : "text-white/40")}>Binary</button>
                            </div>
                            <button onClick={stopCamera} className="w-11 h-11 flex items-center justify-center bg-black/60 backdrop-blur-2xl rounded-xl border border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Centered Reticle */}
                        {!isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                <div className="w-64 h-64 border-[1px] border-white/40 rounded-3xl" />
                                <div className="absolute w-4 h-4 border-2 border-white/60 rounded-full" />
                            </div>
                        )}

                        <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center">
                            <button
                                onClick={triggerCapture}
                                className={cn(
                                    "w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-500 transform",
                                    isLocked ? "border-emerald-500 bg-emerald-500/20 scale-110 shadow-[0_0_50px_rgba(16,185,129,0.4)]" : "border-white/20 bg-black/20"
                                )}
                            >
                                <div className={cn("w-16 h-16 rounded-full transition-all duration-500", isLocked ? "bg-emerald-400 scale-90" : "bg-white shadow-xl shadow-white/20")} />
                            </button>
                        </div>

                        <div className="absolute bottom-8 right-8">
                            <div className="flex items-center gap-3 px-5 py-2.5 bg-black/60 backdrop-blur-3xl rounded-2xl border border-white/10">
                                <ShieldCheck className="w-5 h-5 text-teal-400" />
                                <div className="text-left">
                                    <p className="text-[9px] font-black text-white uppercase leading-none">PII Shield</p>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Hardware Secured</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </GlassCard>

            {/* Batch Tray UI */}
            {capturedPages.length > 0 && (
                <GlassCard className="w-full p-6 border-emerald-500/20 bg-emerald-500/5 animate-in slide-in-from-bottom-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex -space-x-12 overflow-visible">
                            {capturedPages.slice(-4).map((img, i) => (
                                <div key={i} className="w-24 h-32 rounded-xl border-2 border-white/20 overflow-hidden shadow-2xl transform hover:-translate-y-4 transition-transform bg-black" style={{ zIndex: i }}>
                                    <img src={img} className="w-full h-full object-cover" />
                                </div>
                            ))}
                            {capturedPages.length > 4 && (
                                <div className="w-24 h-32 rounded-xl border-2 border-white/20 flex items-center justify-center bg-slate-900 shadow-2xl text-white font-black z-10">
                                    +{capturedPages.length - 4}
                                </div>
                            )}
                        </div>

                        <div className="text-center md:text-left">
                            <div className="flex items-center gap-3 mb-1">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                <h4 className="text-lg font-black text-white uppercase tracking-tighter">Batch Pipeline Active</h4>
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{capturedPages.length} Pages Captured • Forensic Ready</p>
                        </div>

                        <div className="flex gap-4">
                            <Button onClick={proceedToOcr} variant="primary" className="h-14 px-10 rounded-2xl ring-4 ring-emerald-500/20 font-black uppercase text-xs tracking-widest flex items-center gap-3">
                                <FileText className="w-4 h-4" /> Finalize Batch
                            </Button>
                            <Button onClick={() => setCapturedPages([])} variant="secondary" className="h-14 px-8 rounded-2xl border-white/10 text-white/40 hover:text-red-400 transition-colors uppercase font-black text-[10px] tracking-widest">
                                Flush
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
