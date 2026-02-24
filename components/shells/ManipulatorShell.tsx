'use client';

import React, { useState } from 'react';
import { Download, CheckCircle, Layers, Plus, Sparkles, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { FileUpload } from '@/components/shared/FileUpload';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/Button';
import { NextSteps } from '@/components/shared/NextSteps';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSubscription } from '@/components/providers/SubscriptionProvider';
import { useFileStore } from '@/lib/stores/file-store';
import { VirtualGrid } from '@/components/pdf-grid/VirtualGrid';
import { ActionBar } from '@/components/pdf-grid/ActionBar';
import { downloadFile, validatePDFFile } from '@/lib/utils';
import { Tool } from '@/data/tools';
import { GlobalFeatureToggle } from '@/components/shared/GlobalFeatureToggle';
import { GlobalAISidebar } from '@/components/shared/GlobalAISidebar';
import { motion, AnimatePresence } from 'framer-motion';

interface ManipulatorShellProps {
    tool: Tool;
    onAction: (pages: any[], fileMap: Map<string, File>) => Promise<Uint8Array | Blob>;
    actionLabel?: string;
    successMessage?: string;
    renderGrid?: (pages: any[], files: any[]) => React.ReactNode;
    renderActionPanel?: (pages: any[], files: any[], handleExecute: () => void, setPages: (p: any[]) => void) => React.ReactNode;
    accept?: Record<string, string[]>;
    validateFile?: (file: File) => { valid: boolean; error?: string };
}

export function ManipulatorShell({
    tool,
    onAction,
    actionLabel = "Execute Action",
    successMessage = "Process Complete!",
    renderGrid,
    renderActionPanel,
    accept,
    validateFile = validatePDFFile,
}: ManipulatorShellProps) {
    const { limits, isPro } = useSubscription();

    // Store
    const files = useFileStore((state) => state.files);
    const pages = useFileStore((state) => state.pages);
    const addFile = useFileStore((state) => state.addFile);
    const removeFile = useFileStore((state) => state.removeFile);

    // Local State
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("Awaiting command...");
    const [result, setResult] = useState<{ blob: Blob; fileName: string } | null>(null);

    const [activeFeatures, setActiveFeatures] = useState({
        ai: false,
        p2p: false,
        audit: false,
    });

    const toggleFeature = (feature: 'ai' | 'p2p' | 'audit') => {
        setActiveFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
    };

    const handleFilesSelected = (newFiles: File[]) => {
        const validFiles: File[] = [];
        for (const file of newFiles) {
            const validation = validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                toast.error(validation.error || `Invalid file: ${file.name}`);
            }
        }

        if (validFiles.length > 0) {
            validFiles.forEach(f => addFile(f));
            toast.success(`${validFiles.length} files added`);
        }
    };

    const [isScanning, setIsScanning] = useState(false);

    const onFilesSelected = (newFiles: File[]) => {
        setIsScanning(true);
        setTimeout(() => {
            handleFilesSelected(newFiles);
            setIsScanning(false);
        }, 800);
    };

    const handleExecute = async () => {
        if (pages.length === 0) {
            toast.error("Add at least one page");
            return;
        }

        setProcessing(true);
        setProgress(5);
        setStatusMessage("Initializing engine...");

        try {
            const interval = setInterval(() => {
                setProgress(prev => {
                    const next = prev + (Math.random() * 5);
                    if (next > 30) setStatusMessage("Synthesizing page objects...");
                    if (next > 70) setStatusMessage("Finalizing stream...");
                    return next > 95 ? 95 : next;
                });
            }, 300);

            const fileMap = new Map<string, File>();
            files.forEach(f => fileMap.set(f.id, f.file));

            const output = await onAction(pages, fileMap);
            clearInterval(interval);
            setProgress(100);

            const blob = output instanceof Blob ? output : new Blob([output as any], { type: 'application/pdf' });
            setResult({ blob, fileName: `${tool.id}_${Date.now()}.pdf` });
            toast.success(successMessage);
        } catch (error) {
            console.error('Action failed:', error);
            toast.error("Process failed");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="w-full space-y-8">
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
                fileName={files.length > 0 ? `${files.length} documents` : undefined}
            />

            {result && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl mx-auto py-12"
                >
                    <div className="space-y-8">
                        <GlassCard className="p-12 text-center border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                                <CheckCircle className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2 tracking-tight italic">MISSION ACCOMPLISHED</h3>
                            <p className="text-slate-400 mb-8 font-medium italic">Document reassembled and structurally verified.</p>

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
                                    onClick={() => setResult(null)}
                                    className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-[10px] hover:text-white"
                                >
                                    New Session
                                </Button>
                            </div>
                        </GlassCard>

                        <div className="mt-8 pt-8 border-t border-white/5 animate-in slide-up duration-700 delay-300">
                            <NextSteps currentToolId={tool.id} fileBuffer={files[0]?.file ? (files[0].file as any)._arrayBuffer : null} />
                        </div>
                    </div>
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

            {!result && !processing && !isScanning && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6 shadow-2xl">
                            <FileUpload
                                onFilesSelected={onFilesSelected}
                                files={[]}
                                multiple={true}
                                maxSize={limits.maxFileSize}
                                isPro={isPro}
                                accept={accept}
                            />
                        </div>

                        {files.length > 0 && (
                            <div className="h-[600px] w-full relative">
                                <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-xs text-slate-400 border border-white/10">
                                    {pages.length} Pages • {files.length} Docs
                                </div>
                                {renderGrid ? renderGrid(pages, files) : (
                                    <>
                                        <VirtualGrid />
                                        <ActionBar />
                                    </>
                                )}
                            </div>
                        )}

                        {files.length === 0 && (
                            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
                                <div className="text-center">
                                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Drop PDF files to begin arranging pages</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {renderActionPanel ? renderActionPanel(pages, files, handleExecute, useFileStore.getState().reorderPages) : (
                            <GlassCard className="p-8 border-indigo-500/30 bg-indigo-500/5 items-center flex flex-col justify-center h-full min-h-[400px]">
                                <Sparkles className="w-12 h-12 text-indigo-400 mb-6 animate-pulse" />
                                <h4 className="text-xl font-bold text-white mb-2 text-center italic">{tool.name} Engine</h4>
                                <p className="text-sm text-slate-400 text-center mb-8 italic">
                                    Re-compose document payloads with zero-lag background re-shuffling.
                                </p>

                                <div className="w-full space-y-3 mb-8">
                                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                        <span>Total Pages</span>
                                        <span className="text-indigo-400">{pages.length}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                        <span>Source Files</span>
                                        <span className="text-indigo-400">{files.length}</span>
                                    </div>
                                </div>

                                <Button
                                    variant="primary"
                                    onClick={handleExecute}
                                    disabled={pages.length === 0}
                                    size="lg"
                                    className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 shadow-2xl shadow-indigo-600/30 rounded-2xl flex items-center justify-center gap-3 group font-black italic tracking-widest"
                                >
                                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                    {actionLabel.toUpperCase()}
                                </Button>

                                {files.length > 0 && (
                                    <button
                                        onClick={() => files.forEach(f => removeFile(f.id))}
                                        className="mt-6 text-[10px] uppercase font-black text-slate-600 hover:text-red-500 transition-colors tracking-[0.2em]"
                                    >
                                        TERMINATE SESSION
                                    </button>
                                )}
                            </GlassCard>
                        )}
                    </div>
                </motion.div>
            )}

            {processing && (
                <div className="max-w-2xl mx-auto py-20 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-8" />
                    <h3 className="text-2xl font-black text-white mb-4 italic italic tracking-widest">SYNTHESIZING...</h3>
                    <ProgressBar progress={progress} label={statusMessage} />
                </div>
            )}
        </div>
    );
}
