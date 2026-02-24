/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { Layout, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { ManipulatorShell } from '@/components/shells/ManipulatorShell';
import { tools } from '@/data/tools';
import { imageToPdf, ImageToPdfOptions } from '@/lib/services/pdf/converters/imageToPdf';
import { GlassCard } from '@/components/ui/GlassCard';
import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function ImageToPdfTool() {
    const tool = tools.find(t => t.id === 'jpgToPdf')!;
    const [layout, setLayout] = useState<'original' | 'a4'>('original');
    const [autoRotate, setAutoRotate] = useState(true);

    const handleConvert = async (pages: any[], fileMap: Map<string, File>) => {
        const filesToProcess = pages
            .map(p => fileMap.get(p.fileId))
            .filter((f): f is File => !!f);

        // Prepare data for the worker
        const images = await Promise.all(
            filesToProcess.map(async (file) => ({
                data: await file.arrayBuffer(),
                type: file.type,
                name: file.name
            }))
        );

        const result = await globalWorkerPool.runTask<Uint8Array>('IMAGE_TO_PDF', {
            images,
            options: { layout, autoRotate }
        });

        return new Blob([result as any], { type: 'application/pdf' });
    };

    const renderActionPanel = (pages: any[], files: any[], handleExecute: () => void) => (
        <div className="space-y-6">
            <GlassCard className="p-6 border-indigo-500/20 bg-indigo-500/5">
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Layout className="w-3 h-3" />
                    Layout Settings
                </h3>

                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800 mb-6">
                    <button
                        onClick={() => setLayout('original')}
                        className={`py-2 rounded-lg text-[10px] uppercase font-black transition-all ${layout === 'original'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        Original
                    </button>
                    <button
                        onClick={() => setLayout('a4')}
                        className={`py-2 rounded-lg text-[10px] uppercase font-black transition-all ${layout === 'a4'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        Standard A4
                    </button>
                </div>

                {layout === 'a4' && (
                    <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-white/5 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-white">Smart Auto-Rotate</span>
                            <span className="text-[8px] text-slate-500 uppercase tracking-tighter font-black">Fit Landscape Photos</span>
                        </div>
                        <button
                            onClick={() => setAutoRotate(!autoRotate)}
                            className={`w-8 h-4 rounded-full transition-colors relative ${autoRotate ? 'bg-indigo-600' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${autoRotate ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                )}
            </GlassCard>

            <GlassCard className="p-8 border-indigo-500/30 bg-indigo-500/5 items-center flex flex-col justify-center min-h-[300px]">
                <Sparkles className="w-10 h-10 text-indigo-400 mb-4 animate-pulse" />
                <h4 className="text-lg font-bold text-white mb-2 text-center">Batch Assembler</h4>
                <p className="text-[10px] text-slate-500 text-center mb-8 uppercase font-black tracking-widest">
                    Merging {pages.length} Assets
                </p>

                <button
                    onClick={handleExecute}
                    disabled={pages.length === 0}
                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center gap-3 group transition-all font-black text-sm shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                >
                    <Layers className="w-4 h-4" />
                    Build Document
                </button>
            </GlassCard>
        </div>
    );

    return (
        <ManipulatorShell
            tool={tool}
            onAction={handleConvert}
            renderActionPanel={renderActionPanel}
            successMessage="High-Fidelity PDF Generated"
            accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
            validateFile={(file) => ({ valid: file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.webp') })}
        />
    );
}

