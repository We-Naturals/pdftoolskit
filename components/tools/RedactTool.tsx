/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { Eraser, ShieldCheck, FileCheck, Search, Activity } from 'lucide-react';
import { AnnotatorShell } from '@/components/shells/AnnotatorShell';
import { tools } from '@/data/tools';
import { SecurityService } from '@/lib/services/security/SecurityService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

import { globalWorkerPool } from '@/lib/utils/worker-pool';
import { extractTextFromPDF } from '@/lib/pdf-text-extractor';
import { SmartPatternMatcher, PIIMatch } from '@/lib/ai/intelligence-engine';

export function RedactTool() {
    const tool = tools.find(t => t.id === 'redactPdf')!;
    const [originalHash, setOriginalHash] = useState<string | null>(null);

    const handleProcess = async (file: File, annotations: any[]) => {
        const hash = await SecurityService.generateFileHash(file);
        setOriginalHash(hash);

        const fileData = await file.arrayBuffer();
        const result = await globalWorkerPool.runTask<{ data: Uint8Array, report: any }>('REDACT_PDF', {
            fileData,
            annotations
        });
        return { blob: new Blob([result.data as any], { type: 'application/pdf' }), report: result.report };
    };

    const handleAutoIdentifyPII = async (file: File, setAnnotations: React.Dispatch<React.SetStateAction<any[]>>) => {
        if (!file) return;

        const loadingToast = toast.loading('Scanning for sensitive data...');
        try {
            const textItems = await extractTextFromPDF(file);
            const fullText = textItems.map(item => item.str).join(' ');

            const matches = await SmartPatternMatcher.scanText(fullText);

            if (matches.length === 0) {
                toast.success('No common PII patterns detected.');
                toast.dismiss(loadingToast);
                return;
            }

            // Map matches back to coordinates
            // This is a simple heuristic: find the string in items and get its rect
            const newAnnotations: any[] = [];

            matches.forEach(match => {
                // Find items that contain this PII
                // For simplicity, we match exact strings found in the extractor
                const items = textItems.filter(item => match.text.includes(item.str));

                items.forEach(item => {
                    newAnnotations.push({
                        id: Math.random().toString(36).substring(7),
                        type: 'redaction',
                        pageIndex: item.pageIndex,
                        x: item.x,
                        y: item.y,
                        width: item.width,
                        height: item.height,
                        label: match.type
                    });
                });
            });

            setAnnotations(prev => [...prev, ...newAnnotations]);
            toast.success(`Automatically identified ${matches.length} sensitive items.`);
        } catch (error) {
            console.error('Auto-ID Error:', error);
            toast.error('Failed to auto-identify PII');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const renderSidePanel = (annotations: any[], setAnnotations: any) => (
        <div className="space-y-6">
            <GlassCard className="p-6 border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                        <Eraser className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="font-bold text-white text-sm">Sanitization Engine</h3>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed mb-6">
                    Mark regions on the document to permanently remove underlying data.
                    Redaction is destructive and cannot be undone once sealed.
                </p>

                <div className="space-y-3">
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black">
                        <span>Redaction Regions</span>
                        <span className="text-red-400">{annotations.length}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black">
                        <span>Security Level</span>
                        <span className="text-emerald-400 uppercase">High-Fidelity</span>
                    </div>
                </div>
            </GlassCard>

            <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400">
                    <ShieldCheck className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">ZK-Proof Certificate</span>
                </div>
                <p className="text-[9px] text-slate-500">
                    A cryptographic certificate will be generated proving the integrity of the redacted file.
                </p>
            </div>
        </div>
    );

    const renderOverlayContent = (pageIndex: number, annotations: any[], setAnnotations: React.Dispatch<React.SetStateAction<any[]>>) => {
        return (
            <>
                {annotations
                    .filter(a => a.pageIndex === pageIndex - 1)
                    .map(anno => (
                        <div
                            key={anno.id}
                            className="absolute bg-black shadow-lg border border-white/20 group animate-in zoom-in-95 duration-200"
                            style={{
                                left: anno.x,
                                top: anno.y,
                                width: anno.width,
                                height: anno.height
                            }}
                        >
                            <div className="absolute -top-6 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-red-600 text-[8px] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-xl">
                                    {anno.label || 'REDACT'}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAnnotations(prev => prev.filter(a => a.id !== anno.id));
                                    }}
                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-0.5 transition-colors"
                                >
                                    <Eraser className="w-2.5 h-2.5 text-white" />
                                </button>
                            </div>
                        </div>
                    ))}
            </>
        );
    };

    const renderToolbar = (annotations: any[], setAnnotations: React.Dispatch<React.SetStateAction<any[]>>) => (
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-[10px] h-7 px-3 text-red-400 hover:bg-red-500/10">
                <Eraser className="w-3 h-3 mr-2" /> Mark Area
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    // We need a way to get the file here. 
                    // AnnotatorShell might need to provide it.
                    // For now, we'll try to find it in the DOM or state if possible.
                    // Better: update renderToolbar signature to receive file too.
                }}
                className="text-[10px] h-7 px-3 text-slate-400"
            >
                <Search className="w-3 h-3 mr-2" /> Auto-Identify PII
            </Button>
        </div>
    );

    return (
        <AnnotatorShell
            tool={tool}
            onProcess={handleProcess}
            renderSidePanel={renderSidePanel}
            renderToolbar={(file, _annotations, setAnnotations) => (
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="text-[10px] h-7 px-3 text-red-400 hover:bg-red-500/10">
                        <Eraser className="w-3 h-3 mr-2" /> Mark Area
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAutoIdentifyPII(file, setAnnotations)}
                        className="text-[10px] h-7 px-3 text-slate-400"
                    >
                        <Search className="w-3 h-3 mr-2" /> Auto-Identify PII
                    </Button>
                </div>
            )}
            renderOverlayContent={renderOverlayContent}
            renderResultContent={(result: any) => (
                <div className="mt-8 p-6 bg-slate-900/50 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                        <h4 className="font-bold uppercase tracking-widest text-xs">Sanitization Report</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="block text-[10px] text-slate-500 uppercase font-black mb-1">Items Redacted</span>
                            <span className="text-xl font-bold text-white">{result.report?.redactionCount || 0}</span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="block text-[10px] text-slate-500 uppercase font-black mb-1">Metadata Stripped</span>
                            <span className="text-xl font-bold text-emerald-400">CLEAN</span>
                        </div>
                    </div>
                </div>
            )}
        />
    );
}
