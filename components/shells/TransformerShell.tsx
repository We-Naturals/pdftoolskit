'use client';

import React, { ReactNode, useState } from 'react';
import { Download, CheckCircle, RotateCw } from 'lucide-react';
import { FileUpload } from '@/components/shared/FileUpload';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/Button';
import { NextSteps } from '@/components/shared/NextSteps';
import { GlassCard } from '@/components/ui/GlassCard';
import { PDFThumbnail } from '@/components/pdf/PDFThumbnail';
import { useSubscription } from '@/components/providers/SubscriptionProvider';
import { formatFileSize, downloadFile } from '@/lib/utils';
import { Tool } from '@/data/tools';
import { useToolController } from '@/lib/hooks/useToolController';
import { GlobalFeatureToggle } from '@/components/shared/GlobalFeatureToggle';
import { GlobalAISidebar } from '@/components/shared/GlobalAISidebar';
import { motion, AnimatePresence } from 'framer-motion';

interface TransformerShellProps<TSettings = any, TOutput = Blob> {
    tool: Tool;
    engine: (file: File, settings: TSettings) => Promise<TOutput>;
    initialSettings?: TSettings;
    initialFile?: File | null;
    renderSettings?: (settings: TSettings, setSettings: (s: TSettings) => void, file: File) => ReactNode;
    renderPreview?: (settings: TSettings, setSettings: (s: TSettings) => void, file: File) => ReactNode;
    renderSuccess?: (result: TOutput, file: File, reset: () => void) => ReactNode;
    successMessage?: string;
    downloadLabel?: string;
    accept?: Record<string, string[]>;
    autoDownload?: boolean;
    filenamePrefix?: string;
    onFileAdded?: (file: File) => void;
}

export function TransformerShell<TSettings, TOutput = Blob>({
    tool,
    engine,
    initialSettings = {} as TSettings,
    initialFile = null,
    renderSettings,
    renderPreview,
    renderSuccess,
    successMessage = "Processing Successful!",
    downloadLabel = "Download Result",
    accept,
    autoDownload = false,
    filenamePrefix,
    onFileAdded,
}: TransformerShellProps<TSettings, TOutput>) {
    const { limits, isPro } = useSubscription();
    const [currentSettings, setCurrentSettings] = useState<TSettings>(initialSettings);

    const {
        status,
        progress,
        statusMessage,
        result,
        file,
        execute,
        reset,
        handleFileSelect,
        setFile,
    } = useToolController<File, TOutput>({
        engine: (f: File) => engine(f, currentSettings),
    });

    React.useEffect(() => {
        if (autoDownload && status === 'success' && result && file) {
            const prefix = filenamePrefix || file.name.replace('.pdf', '');
            downloadFile(result as unknown as Blob, `${prefix}_processed.pdf`);
        }
    }, [status, result, file, autoDownload, filenamePrefix]);

    const prevFileRef = React.useRef<File | null>(null);
    React.useEffect(() => {
        if (file && file !== prevFileRef.current && onFileAdded) {
            prevFileRef.current = file;
            onFileAdded(file);
        }
        if (!file) {
            prevFileRef.current = null;
        }
    }, [file, onFileAdded]);

    // Effects for initial file
    React.useEffect(() => {
        if (initialFile && !file) {
            setFile(initialFile);
        }
    }, [initialFile, file, setFile]);

    const [activeFeatures, setActiveFeatures] = useState({
        ai: false,
        p2p: false,
        audit: false,
    });

    const toggleFeature = (feature: 'ai' | 'p2p' | 'audit') => {
        setActiveFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
    };

    const [isScanning, setIsScanning] = useState(false);

    const onFileSelected = (files: File[]) => {
        setIsScanning(true);
        setTimeout(() => {
            handleFileSelect(files);
            setIsScanning(false);
        }, 800);
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

            {status === 'idle' && !file && (
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
                        accept={accept}
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
                    <h3 className="text-xl font-black text-indigo-400 italic tracking-widest animate-pulse">FORENSIC SWEEP IN PROGRESS...</h3>
                </div>
            )}

            {file && status === 'idle' && !isScanning && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid lg:grid-cols-3 gap-8 items-start"
                >
                    <div className="lg:col-span-1 space-y-6">
                        <GlassCard className="p-8 flex flex-col items-center border-white/5 hover:border-indigo-500/20 transition-all duration-500">
                            {renderPreview ? renderPreview(currentSettings, setCurrentSettings, file) : (
                                <div className="relative mb-6 text-center group">
                                    <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500/10 to-transparent rounded-2xl blur-xl group-hover:from-indigo-500/20 transition-all" />
                                    <PDFThumbnail
                                        file={file}
                                        pageNumber={1}
                                        width={200}
                                        className="shadow-2xl rounded-xl border border-white/10 relative z-10"
                                        disabled
                                    />
                                    <div className="absolute -bottom-4 -right-4 bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-2xl z-20 italic">
                                        {formatFileSize(file.size)}
                                    </div>
                                </div>
                            )}
                            <h3 className="text-white font-bold truncate w-full text-center mb-4">{file.name}</h3>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setFile(null)}
                                className="rounded-full px-6 text-[10px] font-black"
                            >
                                Change Document
                            </Button>
                        </GlassCard>

                        {renderSettings && (
                            <GlassCard className="p-6 border-white/5">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 flex items-center justify-between">
                                    Adaptive Settings
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-indigo-500/30" />)}
                                    </div>
                                </h4>
                                {renderSettings(currentSettings, setCurrentSettings, file!)}
                            </GlassCard>
                        )}
                    </div>

                    <div className="lg:col-span-2">
                        <GlassCard className="p-8 border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden h-full flex flex-col justify-center">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <tool.icon className="w-32 h-32" />
                            </div>
                            <div className="flex items-center gap-6 mb-12">
                                <div className={`w-16 h-16 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5`}>
                                    <tool.icon className="w-8 h-8 text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-white italic tracking-tight">{tool.name} Engine</h4>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">WASM-Powered Payload Re-serialization</p>
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                size="lg"
                                onClick={() => execute(file)}
                                className="w-full py-10 text-2xl bg-indigo-600 hover:bg-indigo-500 shadow-2xl shadow-indigo-600/30 font-black tracking-widest italic rounded-2xl group overflow-hidden relative"
                                icon={<tool.icon className="w-8 h-8 group-hover:scale-110 transition-transform" />}
                            >
                                <span className="relative z-10">{tool.name.toUpperCase()}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </Button>
                        </GlassCard>
                    </div>
                </motion.div>
            )}

            {status === 'processing' && (
                <div className="max-w-xl mx-auto py-20 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-8" />
                    <h3 className="text-2xl font-bold text-white mb-4 italic">SYNTHESIZING...</h3>
                    <ProgressBar progress={progress} label={statusMessage} />
                </div>
            )}

            {status === 'success' && result && (
                <div className="max-w-4xl mx-auto animate-in scale-in duration-500">
                    {renderSuccess ? renderSuccess(result, file!, reset) : (
                        <div className="space-y-8">
                            <GlassCard className="p-12 text-center border-emerald-500/20">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-2">{successMessage}</h3>
                                <p className="text-slate-400 mb-8 font-medium">Your processed document is ready for download.</p>

                                <div className="flex flex-col gap-4">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={() => downloadFile(result as unknown as Blob, `${file?.name.replace('.pdf', '')}_processed.pdf`)}
                                        icon={<Download className="w-6 h-6" />}
                                        className="py-8 text-2xl bg-emerald-600 hover:bg-emerald-500 shadow-2xl shadow-emerald-500/20"
                                    >
                                        {downloadLabel}
                                    </Button>
                                    <Button variant="ghost" onClick={reset} className="text-slate-500 mt-4">
                                        Process Another
                                    </Button>
                                </div>
                            </GlassCard>

                            <div className="mt-8 pt-8 border-t border-white/5 animate-in slide-up duration-700 delay-300">
                                <NextSteps currentToolId={tool.id} fileBuffer={file ? (file as any)._arrayBuffer || null : null} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
