/* eslint-disable */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { pdfjsLib } from '@/lib/utils/pdf-init';
import { GlassCard } from '@/components/ui/GlassCard';
import { FileUpload } from '@/components/shared/FileUpload';
import { Layers, Columns, ZoomIn, ZoomOut, ArrowLeftRight, ChevronLeft, ChevronRight, Maximize2, Split, Zap, Search, Eye, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PDFDiffEngine, DiffHighlight } from '@/lib/services/pdf/diff-engine';
import { globalWorkerPool } from '@/lib/utils/worker-pool';

interface DiffToolProps {
    className?: string;
}

export function DiffTool({ className }: DiffToolProps) {
    const [fileA, setFileA] = useState<File | null>(null);
    const [fileB, setFileB] = useState<File | null>(null);
    const [fileAData, setFileAData] = useState<ArrayBuffer | null>(null);
    const [fileBData, setFileBData] = useState<ArrayBuffer | null>(null);
    const [pdfA, setPdfA] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [pdfB, setPdfB] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [mode, setMode] = useState<'overlay' | 'side-by-side' | 'curtain'>('overlay');
    const [scale, setScale] = useState(1);
    const [opacity, setOpacity] = useState(50); // For File B in overlay
    const [blendMode, setBlendMode] = useState<'difference' | 'overlay'>('overlay');
    const [curtainPos, setCurtainPos] = useState(50); // Percentage for split screen
    const [isFlickering, setIsFlickering] = useState(false);
    const [flickerRate, setFlickerRate] = useState(200); // ms
    const [flickerA, setFlickerA] = useState(true);
    const [showLoupe, setShowLoupe] = useState(false);
    const [loupePos, setLoupePos] = useState({ x: 0, y: 0 });
    const [showStructuralDiff, setShowStructuralDiff] = useState(false);
    const [highlightsA, setHighlightsA] = useState<DiffHighlight[]>([]);
    const [highlightsB, setHighlightsB] = useState<DiffHighlight[]>([]);


    // Refs for synchronization and rendering
    const canvasARef = useRef<HTMLCanvasElement>(null);
    const canvasBRef = useRef<HTMLCanvasElement>(null);
    const scrollARef = useRef<HTMLDivElement>(null);
    const scrollBRef = useRef<HTMLDivElement>(null);

    // Initial PDF Loading
    useEffect(() => {
        const loadPDF = async (file: File, setter: (pdf: pdfjsLib.PDFDocumentProxy | null) => void, dataSetter: (data: ArrayBuffer | null) => void) => {
            try {
                // Dynamically import pdfjsLib to ensure it's loaded when needed
                const { pdfjsLib } = await import('@/lib/utils/pdf-init');
                const buffer = await file.arrayBuffer();
                dataSetter(buffer);
                const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
                setter(pdf);
            } catch (err) {
                console.error("Failed to load PDF:", err);
                setter(null);
                dataSetter(null);
            }
        };

        if (fileA) loadPDF(fileA, setPdfA, setFileAData); else { setPdfA(null); setFileAData(null); }
        if (fileB) loadPDF(fileB, setPdfB, setFileBData); else { setPdfB(null); setFileBData(null); }

        // Reset page on file change
        setPageNumber(1);
    }, [fileA, fileB]);

    // Render logic
    useEffect(() => {
        const renderPage = async (data: ArrayBuffer, canvas: HTMLCanvasElement, pdf: pdfjsLib.PDFDocumentProxy) => {
            if (pageNumber > pdf.numPages) return;

            const imageBitmap = await globalWorkerPool.runTask<ImageBitmap>('RENDER_PAGE', {
                fileData: data,
                pageNum: pageNumber,
                scale: 2 * scale
            });

            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            canvas.style.width = `${imageBitmap.width / 2} px`;
            canvas.style.height = `${imageBitmap.height / 2} px`;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageBitmap, 0, 0);
            imageBitmap.close();
        };

        if (fileAData && canvasARef.current && pdfA) renderPage(fileAData, canvasARef.current, pdfA);
        if (fileBData && canvasBRef.current && pdfB) renderPage(fileBData, canvasBRef.current, pdfB);

    }, [fileAData, fileBData, pdfA, pdfB, pageNumber, scale]);

    // Sync Scrolling Logic
    useEffect(() => {
        if (mode !== 'side-by-side' || !scrollARef.current || !scrollBRef.current) return;

        const syncScroll = (e: Event) => {
            const target = e.target as HTMLDivElement;
            const source = target === scrollARef.current ? scrollARef.current : scrollBRef.current;
            const other = target === scrollARef.current ? scrollBRef.current : scrollARef.current;

            if (other && source) {
                other.scrollTop = source.scrollTop;
                other.scrollLeft = source.scrollLeft;
            }
        };

        const a = scrollARef.current;
        const b = scrollBRef.current;

        a.addEventListener('scroll', syncScroll);
        b.addEventListener('scroll', syncScroll);

        return () => {
            if (a) a.removeEventListener('scroll', syncScroll);
            if (b) b.removeEventListener('scroll', syncScroll);
        };
    }, [mode, pdfA, pdfB]);

    // Flicker logic
    useEffect(() => {
        if (!isFlickering) {
            setFlickerA(true);
            return;
        }
        const interval = setInterval(() => {
            setFlickerA(f => !f);
        }, flickerRate);
        return () => clearInterval(interval);
    }, [isFlickering, flickerRate]);

    // Structural Diff logic
    useEffect(() => {
        const runStructuralDiff = async () => {
            if (!showStructuralDiff || !pdfA || !pdfB) {
                setHighlightsA([]);
                setHighlightsB([]);
                return;
            }

            try {
                const result = await globalWorkerPool.runTask<{ highlightsA: DiffHighlight[], highlightsB: DiffHighlight[] }>('DIFF_PAGES', {
                    fileAData,
                    fileBData,
                    pageNum: pageNumber
                });
                setHighlightsA(result.highlightsA);
                setHighlightsB(result.highlightsB);
            } catch (err) {
                console.error("Structural diff failed:", err);
            }
        };

        runStructuralDiff();
    }, [showStructuralDiff, pdfA, pdfB, pageNumber]);

    const maxPages = Math.max(pdfA?.numPages || 0, pdfB?.numPages || 0);

    return (
        <div className={cn("flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 mb-12", className)}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ArrowLeftRight className="text-cyan-400" />
                    Visual Diff
                </h2>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-white/10 w-full md:w-auto">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setMode('overlay')}
                            className={cn("px-3 py-1.5 rounded transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider", mode === 'overlay' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Overlay
                        </button>
                        <button
                            onClick={() => setMode('curtain')}
                            className={cn("px-3 py-1.5 rounded transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider", mode === 'curtain' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                        >
                            <Split className="w-3.5 h-3.5" />
                            Curtain
                        </button>
                        <button
                            onClick={() => setMode('side-by-side')}
                            className={cn("px-3 py-1.5 rounded transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider", mode === 'side-by-side' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                        >
                            <Columns className="w-3.5 h-3.5" />
                            Side by Side
                        </button>
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden lg:block" />

                    {/* Pagination */}
                    <div className="flex items-center gap-3 bg-slate-800 rounded-lg p-1">
                        <button
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                            className="p-1.5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        <div className="flex items-center gap-1.5 px-1">
                            <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Page</span>
                            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">{pageNumber}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">of {maxPages || 1}</span>
                        </div>
                        <button
                            disabled={pageNumber >= maxPages}
                            onClick={() => setPageNumber(p => Math.min(maxPages, p + 1))}
                            className="p-1.5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden lg:block" />

                    {/* Structural IQ Toggle */}
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setShowStructuralDiff(!showStructuralDiff)}
                            className={cn(
                                "px-3 py-1.5 rounded transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider",
                                showStructuralDiff ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]" : "text-slate-400 hover:text-white"
                            )}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Structural IQ
                        </button>
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden lg:block" />

                    {/* Zoom */}
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                        <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-1.5 hover:bg-white/10 rounded text-slate-400"><ZoomOut className="w-4 h-4" /></button>
                        <span className="text-[10px] font-mono w-10 text-center text-white font-bold">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(4, s + 0.1))} className="p-1.5 hover:bg-white/10 rounded text-slate-400"><ZoomIn className="w-4 h-4" /></button>
                    </div>

                    {mode === 'overlay' && fileB && (
                        <>
                            <div className="h-6 w-px bg-white/10 hidden lg:block" />
                            <div className="flex bg-slate-800 rounded-lg p-1">
                                <button
                                    onClick={() => setIsFlickering(!isFlickering)}
                                    className={cn("px-2.5 py-1.5 rounded transition-all flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tighter", isFlickering ? "bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "text-slate-400 hover:text-white")}
                                >
                                    <Zap className={cn("w-3 h-3", isFlickering && "animate-pulse")} />
                                    Flicker
                                </button>
                                <button
                                    onClick={() => setShowLoupe(!showLoupe)}
                                    className={cn("px-2.5 py-1.5 rounded transition-all flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tighter", showLoupe ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                                >
                                    <Search className="w-3 h-3" />
                                    Loupe
                                </button>
                            </div>

                            <div className="h-6 w-px bg-white/10 hidden lg:block" />
                            <div className="flex items-center gap-3 px-2">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Engine:</span>
                                <button
                                    onClick={() => setBlendMode(blendMode === 'overlay' ? 'difference' : 'overlay')}
                                    className={cn(
                                        "text-[9px] font-black px-3 py-1.5 rounded-md border transition-all uppercase tracking-tighter",
                                        blendMode === 'difference' ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]" : "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                                    )}
                                >
                                    {blendMode === 'difference' ? 'Difference' : 'Overlay'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-4 border-l-4 border-l-red-500 bg-red-500/5">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-red-400 text-sm uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Document A (Base)
                        </span>
                        {fileA && <button onClick={() => setFileA(null)} className="text-[10px] text-slate-400 hover:text-white uppercase tracking-tighter">Remove</button>}
                    </div>
                    {!fileA ? (
                        <FileUpload onFilesSelected={(files) => setFileA(files[0])} accept={{ 'application/pdf': ['.pdf'] }} maxSize={10 * 1024 * 1024} />
                    ) : (
                        <div className="text-xs text-center py-4 bg-slate-900/50 rounded-lg border border-white/5 truncate px-4">{fileA.name}</div>
                    )}
                </GlassCard>

                <GlassCard className="p-4 border-l-4 border-l-blue-500 bg-blue-500/5">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-blue-400 text-sm uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Document B (Compare)
                        </span>
                        {fileB && <button onClick={() => setFileB(null)} className="text-[10px] text-slate-400 hover:text-white uppercase tracking-tighter">Remove</button>}
                    </div>
                    {!fileB ? (
                        <FileUpload onFilesSelected={(files) => setFileB(files[0])} accept={{ 'application/pdf': ['.pdf'] }} maxSize={10 * 1024 * 1024} />
                    ) : (
                        <div className="text-xs text-center py-4 bg-slate-900/50 rounded-lg border border-white/5 truncate px-4">{fileB.name}</div>
                    )}
                </GlassCard>
            </div>

            {/* Viewer Section */}
            <div className="relative group">
                <GlassCard className="min-h-[600px] h-[80vh] flex items-start justify-center overflow-hidden bg-[#0a0a0c] p-0 border-white/5 shadow-inner">
                    {!fileA && !pdfA && !fileB && !pdfB && (
                        <div className="flex flex-col items-center gap-4 m-auto text-slate-600">
                            <div className="p-6 rounded-full bg-slate-900 shadow-xl border border-white/5">
                                <Maximize2 className="w-12 h-12 opacity-50 text-cyan-500" />
                            </div>
                            <p className="text-xs uppercase tracking-widest font-bold">Awaiting Documents...</p>
                        </div>
                    )}

                    {(pdfA || pdfB) && (
                        <div className={cn(
                            "w-full h-full flex transition-all duration-500 ease-in-out origin-top px-4",
                            mode === 'side-by-side' ? "gap-4 overflow-hidden" : "justify-center overflow-auto py-12 pb-24"
                        )}>
                            {mode === 'overlay' || mode === 'curtain' ? (
                                <div
                                    className="relative inline-flex shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 rounded-lg overflow-hidden bg-white shrink-0"
                                    onMouseMove={(e) => {
                                        if (!showLoupe) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setLoupePos({
                                            x: e.clientX - rect.left,
                                            y: e.clientY - rect.top
                                        });
                                    }}
                                >
                                    {/* Layer A */}
                                    <div className={cn("relative z-10 transition-opacity", isFlickering && !flickerA ? "opacity-0" : "opacity-100")}>
                                        <canvas ref={canvasARef} className="max-w-none" />
                                        {/* Highlights A */}
                                        {showStructuralDiff && highlightsA.map((h, i) => (
                                            <div
                                                key={`a - ${i} `}
                                                className="absolute pointer-events-none bg-red-500/20 border border-red-500/40 rounded-sm z-30"
                                                style={{
                                                    left: h.x * scale,
                                                    top: h.y * scale, // This needs validation vs PDF transform
                                                    width: h.width * scale,
                                                    height: h.height * scale
                                                }}
                                            />
                                        ))}
                                    </div>
                                    {/* Layer B */}
                                    {pdfB && (
                                        <div className={cn("absolute top-0 left-0 z-20 pointer-events-none transition-opacity", isFlickering && flickerA ? "opacity-0" : "opacity-100")} style={{
                                            opacity: mode === 'curtain' ? 1 : (blendMode === 'difference' ? 1 : opacity / 100),
                                            mixBlendMode: mode === 'curtain' ? 'normal' : (blendMode === 'difference' ? 'difference' : 'normal'),
                                            clipPath: mode === 'curtain' ? `inset(0 0 0 ${curtainPos} %)` : 'none'
                                        }}>
                                            <canvas ref={canvasBRef} className="max-w-none" />
                                            {/* Highlights B */}
                                            {showStructuralDiff && highlightsB.map((h, i) => (
                                                <div
                                                    key={`b - ${i} `}
                                                    className="absolute pointer-events-none bg-green-500/20 border border-green-500/40 rounded-sm z-30"
                                                    style={{
                                                        left: h.x * scale,
                                                        top: h.y * scale,
                                                        width: h.width * scale,
                                                        height: h.height * scale
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Loupe */}
                                    {showLoupe && pdfB && (
                                        <div
                                            className="absolute z-50 pointer-events-none w-48 h-48 rounded-full border-4 border-white/20 shadow-2xl overflow-hidden bg-white"
                                            style={{
                                                left: loupePos.x,
                                                top: loupePos.y,
                                                transform: 'translate(-50%, -50%)',
                                            }}
                                        >
                                            <div style={{
                                                position: 'absolute',
                                                left: -loupePos.x * 2 + 96,
                                                top: -loupePos.y * 2 + 96,
                                                width: '200%',
                                                height: '200%',
                                                transformOrigin: '0 0',
                                                transform: 'scale(1)',
                                                mixBlendMode: 'difference'
                                            }}>
                                                {/* Layer A (Base for Loupe) */}
                                                <div className="absolute top-0 left-0">
                                                    <canvas
                                                        width={canvasARef.current?.width}
                                                        height={canvasARef.current?.height}
                                                        style={{ width: canvasARef.current?.style.width, height: canvasARef.current?.style.height }}
                                                        ref={(el) => {
                                                            if (el && canvasARef.current) {
                                                                const ctx = el.getContext('2d');
                                                                if (ctx) ctx.drawImage(canvasARef.current, 0, 0);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                {/* Layer B (Difference for Loupe) */}
                                                <div className="absolute top-0 left-0">
                                                    <canvas
                                                        width={canvasBRef.current?.width}
                                                        height={canvasBRef.current?.height}
                                                        style={{ width: canvasBRef.current?.style.width, height: canvasBRef.current?.style.height }}
                                                        ref={(el) => {
                                                            if (el && canvasBRef.current) {
                                                                const ctx = el.getContext('2d');
                                                                if (ctx) ctx.drawImage(canvasBRef.current, 0, 0);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 border-8 border-white/10 rounded-full" />
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-[8px] font-black text-white uppercase tracking-tighter rounded-b">
                                                Diff Loupe
                                            </div>
                                        </div>
                                    )}

                                    {/* Curtain Splitter */}
                                    {mode === 'curtain' && pdfB && (
                                        <div
                                            className="absolute top-0 bottom-0 z-30 w-1 bg-cyan-500 cursor-col-resize group/splitter"
                                            style={{ left: `${curtainPos}% ` }}
                                            onMouseDown={(e) => {
                                                const startX = e.pageX;
                                                const startPos = curtainPos;
                                                const container = e.currentTarget.parentElement;
                                                if (!container) return;
                                                const rect = container.getBoundingClientRect();

                                                const onMouseMove = (moveEvent: MouseEvent) => {
                                                    const deltaX = moveEvent.pageX - startX;
                                                    const newPos = Math.max(0, Math.min(100, startPos + (deltaX / rect.width) * 100));
                                                    setCurtainPos(newPos);
                                                };

                                                const onMouseUp = () => {
                                                    document.removeEventListener('mousemove', onMouseMove);
                                                    document.removeEventListener('mouseup', onMouseUp);
                                                };

                                                document.addEventListener('mousemove', onMouseMove);
                                                document.addEventListener('mouseup', onMouseUp);
                                            }}
                                        >
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20 group-hover/splitter:scale-110 transition-transform">
                                                <ArrowLeftRight className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-600 rounded text-[8px] font-black text-white uppercase tracking-tighter opacity-0 group-hover/splitter:opacity-100 transition-opacity">
                                                Slide
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Scroll A */}
                                    <div
                                        ref={scrollARef}
                                        className="flex-1 overflow-auto p-12 scrollbar-none border-r border-white/5 bg-slate-900/20"
                                    >
                                        <div className="shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 rounded-lg overflow-hidden bg-white inline-block relative">
                                            <canvas ref={canvasARef} className="max-w-none" />
                                            {showStructuralDiff && highlightsA.map((h, i) => (
                                                <div
                                                    key={`a - sb - ${i} `}
                                                    className="absolute pointer-events-none bg-red-500/20 border border-red-500/40 rounded-sm z-30"
                                                    style={{
                                                        left: h.x * scale,
                                                        top: h.y * scale,
                                                        width: h.width * scale,
                                                        height: h.height * scale
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <div className="mt-4 text-center">
                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Document A</span>
                                        </div>
                                    </div>

                                    {/* Scroll B */}
                                    <div
                                        ref={scrollBRef}
                                        className="flex-1 overflow-auto p-12 scrollbar-none bg-slate-900/20"
                                    >
                                        <div className="shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 rounded-lg overflow-hidden bg-white inline-block relative">
                                            <canvas ref={canvasBRef} className="max-w-none" />
                                            {showStructuralDiff && highlightsB.map((h, i) => (
                                                <div
                                                    key={`b - sb - ${i} `}
                                                    className="absolute pointer-events-none bg-green-500/20 border border-green-500/40 rounded-sm z-30"
                                                    style={{
                                                        left: h.x * scale,
                                                        top: h.y * scale,
                                                        width: h.width * scale,
                                                        height: h.height * scale
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <div className="mt-4 text-center">
                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Document B</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </GlassCard>

                {/* Overlay Floating Controls */}
                {mode === 'overlay' && pdfB && blendMode === 'overlay' && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 shadow-2xl z-30 flex flex-col items-center gap-3 w-64 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between w-full text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            <span>Base (A)</span>
                            <span>Compare (B)</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={opacity}
                            onChange={(e) => setOpacity(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <p className="text-[10px] text-cyan-400 font-mono">Transparency: {opacity}%</p>
                    </div>
                )}

                {mode === 'overlay' && pdfB && blendMode === 'difference' && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-900/90 backdrop-blur-xl px-6 py-3 rounded-2xl border border-red-500/20 shadow-2xl z-30 flex flex-col items-center animate-in zoom-in-95">
                        <p className="text-[10px] text-red-200 font-bold uppercase tracking-widest">Difference Engine Active</p>
                        <p className="text-[9px] text-red-300/60 mt-1 italic">Matching pixels cancel out (black means no change)</p>
                    </div>
                )}
            </div>
        </div>
    );
}

