/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Settings2, Zap, Layout } from 'lucide-react';
import JSZip from 'jszip';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';
import { GlassCard } from '@/components/ui/GlassCard';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function PdfToImageTool() {
    const tool = tools.find(t => t.id === 'pdfToJpg')!;
    const [dpi, setDpi] = useState(150);
    const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');

    const handleConvert = async (file: File) => {
        const fileData = await file.arrayBuffer();
        const result = await globalWorkerPool.runTask<Uint8Array>('PDF_TO_IMAGE', {
            fileData,
            format,
            scale: dpi / 72,
            quality: 0.9
        });

        return new Blob([result as any], { type: 'application/zip' });
    };

    const renderOptions = () => (
        <div className="space-y-6">
            <GlassCard className="p-6 border-orange-500/20 bg-orange-500/5">
                <div className="flex justify-between items-center mb-6">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Resolution Matrix</label>
                    <span className="text-[10px] font-black text-white px-2 py-1 bg-orange-500 rounded-md shadow-lg shadow-orange-500/20">{dpi} DPI</span>
                </div>

                <input
                    type="range"
                    min="72"
                    max="600"
                    step="1"
                    value={dpi}
                    onChange={(e) => setDpi(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-500 border border-white/5"
                />

                <div className="flex justify-between text-[8px] text-slate-500 mt-2 uppercase font-bold">
                    <span>Web (72)</span>
                    <span>HD (300)</span>
                    <span>Ultra (600)</span>
                </div>
            </GlassCard>

            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Target Format</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800">
                    {(['jpeg', 'png', 'webp'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFormat(f)}
                            className={`py-2 rounded-lg text-[10px] uppercase font-black transition-all ${format === f
                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                                : 'text-slate-500 hover:text-white'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-around gap-4 pt-4">
                <div className="flex flex-col items-center gap-1.5 opacity-50">
                    <Zap className="w-3 h-3 text-orange-400" />
                    <span className="text-[8px] font-black uppercase text-slate-500">Vector Raster</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 opacity-50">
                    <Layout className="w-3 h-3 text-orange-400" />
                    <span className="text-[8px] font-black uppercase text-slate-500">Auto Zipped</span>
                </div>
            </div>
        </div>
    );

    return (
        <TransformerShell
            tool={tool}
            engine={handleConvert}
            renderSettings={renderOptions}
            successMessage="PDF Successfully Rasterized"
            downloadLabel={`Download ${format.toUpperCase()} Package`}
        />
    );
}
