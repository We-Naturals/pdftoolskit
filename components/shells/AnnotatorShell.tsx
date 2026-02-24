'use client';

import React, { useState } from 'react';
import { Download, CheckCircle, MousePointer2, RotateCw } from 'lucide-react';
import { FileUpload } from '@/components/shared/FileUpload';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/Button';
import { NextSteps } from '@/components/shared/NextSteps';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tool } from '@/data/tools';
import { useToolController } from '@/lib/hooks/useToolController';
import { useSubscription } from '@/components/providers/SubscriptionProvider';
import { downloadFile } from '@/lib/utils';
import { PDFPageViewer } from '@/components/pdf/PDFPageViewer';
import { InteractiveOverlay } from '@/components/pdf/InteractiveOverlay';
import { GlobalFeatureToggle } from '@/components/shared/GlobalFeatureToggle';
import { GlobalAISidebar } from '@/components/shared/GlobalAISidebar';
import { motion } from 'framer-motion';

interface AnnotatorShellProps<TAnnotation = unknown, TResult = { blob: Blob, fileName: string }> {
    tool: Tool;
    onProcess: (file: File, annotations: TAnnotation[]) => Promise<Blob | TResult>;
    renderSidePanel?: (annotations: TAnnotation[], setAnnotations: React.Dispatch<React.SetStateAction<TAnnotation[]>>) => React.ReactNode;
    renderToolbar?: (file: File, annotations: TAnnotation[], setAnnotations: React.Dispatch<React.SetStateAction<TAnnotation[]>>) => React.ReactNode;
    renderOverlayContent?: (pageIndex: number, annotations: TAnnotation[], setAnnotations: React.Dispatch<React.SetStateAction<TAnnotation[]>>) => React.ReactNode;
}

export function AnnotatorShell<TAnnotation, TResult extends { blob: Blob, fileName: string }>({
    tool,
    onProcess,
    renderSidePanel,
    renderToolbar,
    renderOverlayContent
}: AnnotatorShellProps<TAnnotation, TResult>) {
    const { limits, isPro } = useSubscription();

    const [activeFeatures, setActiveFeatures] = useState({
        ai: false,
        p2p: false,
        audit: tool.features?.audit || false
    });

    const toggleFeature = (feature: keyof typeof activeFeatures) => {
        // eslint-disable-next-line security/detect-object-injection
        setActiveFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
    };

    const [annotations, setAnnotations] = useState<TAnnotation[]>([]);
    const [viewerDimensions, setViewerDimensions] = useState({ width: 0, height: 0 });

    const {
        status,
        progress,
        statusMessage,
        result,
        file,
        execute,
        handleFileSelect,
        setFile,
        setResult,
    } = useToolController<File, TResult>({
        engine: async (f: File) => {
            const outcome = await onProcess(f, annotations);
            if (outcome instanceof Blob) {
                return { blob: outcome, fileName: `processed_${f.name}` } as TResult;
            }
            // If outcome is not a Blob, it must be of type TResult based on onProcess signature
            return {
                ...outcome,
                fileName: outcome.fileName || `processed_${f.name}`
            } as TResult;
        },
    });

    const [isScanning, setIsScanning] = useState(false);

    const onFileSelected = (files: File[]) => {
        setIsScanning(true);
        setTimeout(() => {
            handleFileSelect(files);
            setIsScanning(false);
            if (files.length > 0 && tool.features?.ai) {
                setActiveFeatures(prev => ({ ...prev, ai: true }));
            }
        }, 800);
    };

    const handleExecute = async () => {
        if (!file) return;
        execute(file);
    };

    return (
        <div className="w-full">
            {/* Global Features */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                <GlobalFeatureToggle
                    tool={tool}
                    activeFeatures={activeFeatures}
                    onToggle={toggleFeature}
                />
            </div>

            <GlobalAISidebar
                isOpen={activeFeatures.ai}
                onClose={() => toggleFeature('ai')}
                toolName={tool.name}
                fileName={file?.name}
            />

            {!file && !result && status !== 'processing' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="duration-700"
                >
                    <FileUpload
                        onFilesSelected={onFileSelected}
                        files={[]}
                        multiple={false}
                        maxSize={limits.maxFileSize}
                        isPro={isPro}
                    />
                </motion.div>
            )}

            {isScanning && (
                <div className="max-w-xl mx-auto py-20 text-center animate-in zoom-in-95 duration-500">
                    <div className="relative w-32 h-44 mx-auto mb-8 bg-slate-800 rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent animate-scan" style={{ height: '30%', animationDuration: '0.8s' }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <RotateCw className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    </div>
                    <h3 className="text-xl font-black text-indigo-400 italic tracking-widest animate-pulse uppercase">Forensic Sweep In Progress...</h3>
                </div>
            )}

            {file && !result && status !== 'processing' && !isScanning && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-4 gap-8"
                >
                    {/* Left Panel: Tools & Controls */}
                    <div className="lg:col-span-1 space-y-6 animate-in slide-right duration-500">
                        <GlassCard className="p-6">
                            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                                <tool.icon className="w-5 h-5 text-indigo-500" />
                                {tool.name}
                            </h4>

                            {renderSidePanel && renderSidePanel(annotations, setAnnotations)}

                            <div className="mt-8 space-y-3">
                                <Button
                                    variant="primary"
                                    onClick={handleExecute}
                                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20"
                                    icon={<tool.icon className="w-5 h-5" />}
                                >
                                    Save & Export
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFile(null)}
                                    className="w-full text-slate-500"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </GlassCard>

                        <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 italic">
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                Tip: Use your mouse to position your elements precisely on the canvas.
                                Changes are rendered serverless for maximum privacy.
                            </p>
                        </div>
                    </div>

                    {/* Main Interaction Area */}
                    <div className="lg:col-span-3 space-y-6 animate-in slide-up duration-500">
                        {renderToolbar && file && (
                            <GlassCard className="p-2 flex items-center justify-center gap-2">
                                {renderToolbar(file, annotations, setAnnotations)}
                            </GlassCard>
                        )}

                        <div className="bg-slate-900 rounded-[2rem] overflow-hidden border border-white/5 relative min-h-[700px] flex items-center justify-center p-12 shadow-2xl">
                            <div className="relative shadow-2xl border border-white/10 rounded-lg overflow-hidden group">
                                <PDFPageViewer
                                    file={file}
                                    pageNumber={1}
                                    onPageLoad={(width, height) => setViewerDimensions({ width, height })}
                                />
                                {viewerDimensions.width > 0 && (
                                    <InteractiveOverlay
                                        width={viewerDimensions.width}
                                        height={viewerDimensions.height}
                                        selection={null}
                                        onSelectionChange={() => { }}
                                    >
                                        {renderOverlayContent && renderOverlayContent(1, annotations, setAnnotations)}
                                    </InteractiveOverlay>
                                )}

                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full text-[10px] text-slate-400 border border-white/10 flex items-center gap-2 uppercase tracking-widest font-black">
                                        <MousePointer2 className="w-3 h-3" />
                                        Interactive Layer
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {status === 'processing' && (
                <div className="max-w-xl mx-auto py-20 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-8" />
                    <h3 className="text-2xl font-bold text-white mb-4 italic">FINALIZING...</h3>
                    <ProgressBar progress={progress} label={statusMessage} />
                </div>
            )}

            {result && (
                <div className="max-w-2xl mx-auto py-12 animate-in slide-up duration-500">
                    <div className="space-y-8">
                        <GlassCard className="p-12 text-center border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                                <CheckCircle className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2 tracking-tight flex items-center justify-center gap-3 italic">
                                MISSION ACCOMPLISHED
                            </h3>
                            <p className="text-slate-400 mb-8 font-medium italic">Document finalized with WASM precision.</p>

                            <div className="flex flex-col gap-4">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={() => downloadFile(result.blob, result.fileName)}
                                    icon={<Download className="w-6 h-6" />}
                                    className="py-8 text-2xl bg-emerald-600 hover:bg-emerald-500 shadow-2xl shadow-emerald-500/30 rounded-2xl font-black tracking-widest italic"
                                >
                                    DOWNLOAD PDF
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => { setFile(null); setResult(null); setAnnotations([]); }}
                                    className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-[10px] hover:text-white"
                                >
                                    Start New Project
                                </Button>
                            </div>
                        </GlassCard>

                        <div className="mt-8 pt-8 border-t border-white/5 animate-in slide-up duration-700 delay-300">
                            <NextSteps currentToolId={tool.id} fileBuffer={file ? (file as File & { _arrayBuffer?: ArrayBuffer })._arrayBuffer : null} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
