/* eslint-disable */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Activity, ShieldCheck, PenTool, Eraser, Type, Image as ImageIcon,
    Smartphone, Laptop, Monitor, RefreshCw, Zap, Sparkles, Fingerprint,
    Check, Search, Loader2, ScanEye, Download
} from 'lucide-react';
import { AnnotatorShell } from '@/components/shells/AnnotatorShell';
import { tools } from '@/data/tools';
import { cn, getBaseFileName } from '@/lib/utils';
import { useIDKitRequest } from '@worldcoin/idkit';
import type { IDKitResult } from '@worldcoin/idkit';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

type SignatureMode = 'draw' | 'type' | 'upload' | 'remote';
type DrawingTool = 'pen' | 'eraser';
type InkColor = 'black' | 'blue' | 'red';

interface Placement {
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    pageWidth: number;
    pageHeight: number;
}

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function SignTool() {
    const tool = tools.find(t => t.id === 'signPdf')!;

    // State (Extracted from original page.tsx)
    const [mode, setMode] = useState<SignatureMode>('draw');
    const [drawingTool, setDrawingTool] = useState<DrawingTool>('pen');
    const [color, setColor] = useState<InkColor>('black');
    const [hasSignature, setHasSignature] = useState(false);
    const [typedName, setTypedName] = useState('');
    const [selectedFont, setSelectedFont] = useState('Great Vibes');
    const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
    const [enableAuditTrail, setEnableAuditTrail] = useState(true);
    const [placements, setPlacements] = useState<Placement[]>([]);
    const [biometricData, setBiometricData] = useState<any[]>([]);
    const [zkStatus, setZkStatus] = useState<any>(null);
    const [isIdentifying, setIsIdentifying] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [p2pStatus, setP2pStatus] = useState<'idle' | 'linking' | 'connected'>('idle');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState<{ x: number, y: number } | null>(null);

    // Canvas Events
    const startDrawing = (e: any) => {
        setIsDrawing(true);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pos = {
            x: (e.clientX || e.touches[0].clientX) - rect.left,
            y: (e.clientY || e.touches[0].clientY) - rect.top
        };
        setLastPos(pos);
    };

    const draw = (e: any) => {
        if (!isDrawing || !lastPos || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const pos = {
            x: (e.clientX || e.touches[0].clientX) - rect.left,
            y: (e.clientY || e.touches[0].clientY) - rect.top
        };

        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = drawingTool === 'eraser' ? '#ffffff' : (color === 'black' ? '#000' : color === 'blue' ? '#2563eb' : '#dc2626');
        ctx.lineWidth = drawingTool === 'eraser' ? 20 : 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        setLastPos(pos);
        setHasSignature(true);

        // Mock biometric capture
        setBiometricData(prev => [...prev, { x: pos.x, y: pos.y, timestamp: Date.now() }]);
    };

    const stopDrawing = () => setIsDrawing(false);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        setHasSignature(false);
        setBiometricData([]);
    };

    const handleIdentifyZKSuccess = async (result: IDKitResult) => {
        setIsIdentifying(true);
        try {
            // Simulated ZK Verification
            setTimeout(() => {
                setZkStatus({ verified: true, provider: 'WorldID' });
                toast.success('ZK-Identity Verified');
                setIsIdentifying(false);
            }, 2000);
        } catch (e) {
            setIsIdentifying(false);
            toast.error('ZK Verification Failed');
        }
    };

    const { open: openZK } = useIDKitRequest({
        app_id: 'app_staging_123' as any,
        action: 'sign_engagement',
        onSuccess: handleIdentifyZKSuccess,
    } as any);

    const handleProcess = async (file: File, currentAnnotations: any[]): Promise<Blob> => {
        const toastId = toast.loading("Baking signature into vector space...");

        try {
            const fileData = await file.arrayBuffer();
            let signatureData = '';
            let signatureType: 'image' | 'text' = 'image';

            if (mode === 'draw' && canvasRef.current) {
                signatureData = canvasRef.current.toDataURL('image/png');
                signatureType = 'image';
            } else if (mode === 'type') {
                signatureData = typedName;
                signatureType = 'text';
            } else if (mode === 'upload' && uploadedImage) {
                signatureData = uploadedImage.src;
                signatureType = 'image';
            }

            // Convert annotations to placements the worker understands
            const signaturePlacements = currentAnnotations.map(ann => ({
                pageIndex: ann.pageIndex,
                x: ann.x,
                y: ann.y,
                width: ann.width,
                height: ann.height,
                pageWidth: ann.pageWidth,
                pageHeight: ann.pageHeight
            }));

            const result = await globalWorkerPool.runTask<Uint8Array>('SIGN_PDF', {
                fileData,
                signatureData,
                signatureType,
                placements: signaturePlacements
            });

            toast.success("Signature Embedded!", { id: toastId });
            return new Blob([result as any], { type: 'application/pdf' });
        } catch (error) {
            console.error(error);
            toast.error("Failed to sign PDF", { id: toastId });
            throw error;
        }
    };

    const renderSidePanel = (annotations: any[], setAnnotations: any) => (
        <div className="space-y-6">
            <GlassCard className="p-0 overflow-hidden border-indigo-500/10 bg-slate-900/50">
                <div className="bg-slate-900/80 p-3 border-b border-indigo-500/10 flex justify-between items-center">
                    <h3 className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Signature Engine
                    </h3>
                    <button onClick={clearSignature} className="text-[10px] text-red-400/50 hover:text-red-400">
                        Reset
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
                        {(['draw', 'type', 'upload', 'remote'] as SignatureMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={cn(
                                    "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tighter transition-all",
                                    mode === m ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-xl overflow-hidden min-h-[140px] relative border border-slate-200">
                        {mode === 'draw' && (
                            <canvas
                                ref={canvasRef}
                                width={800} height={400}
                                className="w-full h-auto cursor-crosshair touch-none"
                                onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing}
                                onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                            />
                        )}
                        {mode === 'type' && (
                            <div className="p-4">
                                <input
                                    type="text" value={typedName} placeholder="Sign name..."
                                    onChange={(e) => { setTypedName(e.target.value); setHasSignature(!!e.target.value); }}
                                    className="text-2xl text-center w-full bg-transparent border-b border-slate-200 outline-none p-2 text-slate-900 font-bold"
                                    style={{ fontFamily: selectedFont === 'Great Vibes' ? 'cursive' : 'serif' }}
                                />
                            </div>
                        )}
                        {mode === 'remote' && (
                            <div className="p-4 text-center">
                                <Button size="sm" variant="ghost" className="text-[10px] text-indigo-400" onClick={() => setP2pStatus('linking')}>
                                    <Smartphone className="w-3 h-3 mr-2" /> Generate Link
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>

            <div className="p-4 bg-indigo-950/20 rounded-xl border border-indigo-500/10 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" /> ZK-Identity
                    </span>
                    <button onClick={openZK} disabled={!!zkStatus} className={cn("text-[9px] font-bold px-2 py-1 rounded", zkStatus ? "text-emerald-400 bg-emerald-500/10" : "text-indigo-400 bg-indigo-500/10")}>
                        {zkStatus ? 'Verified' : 'Connect'}
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Audit Trail
                    </span>
                    <div className={cn("w-6 h-3 rounded-full relative bg-slate-700 cursor-pointer", enableAuditTrail && "bg-indigo-600")} onClick={() => setEnableAuditTrail(!enableAuditTrail)}>
                        <div className={cn("absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full transition-all", enableAuditTrail && "left-3.5")} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderToolbar = () => (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <Laptop className="w-3 h-3" />
                <span>DESKTOP VIEW</span>
            </div>
        </div>
    );

    return (
        <AnnotatorShell
            tool={tool}
            onProcess={handleProcess}
            renderSidePanel={renderSidePanel}
            renderToolbar={renderToolbar}
        />
    );
}
