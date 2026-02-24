/* eslint-disable */
'use client';

import React, { Suspense, useState } from 'react';
import { Sparkles, Zap, Shield, Settings2 } from 'lucide-react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { compressPDF } from '@/lib/pdf-utils';
import { tools } from '@/data/tools';
import { cn } from '@/lib/utils';
import { globalWorkerPool } from '@/lib/utils/worker-pool';

type CompressionMode = 'extreme' | 'balanced' | 'lossless' | 'custom';

interface CompressSettings {
    mode: CompressionMode;
    stripMetadata: boolean;
}

function CompressToolContent() {
    const tool = tools.find(t => t.id === 'compressPdf')!;

    const [initialSettings] = useState<CompressSettings>({
        mode: 'balanced',
        stripMetadata: true,
    });

    const renderSettings = (settings: CompressSettings, setSettings: (s: CompressSettings) => void) => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
                {[
                    { id: 'balanced', title: 'Balanced', desc: 'Standard Size', icon: Sparkles, color: 'indigo' },
                    { id: 'extreme', title: 'Extreme', desc: 'Max Squeeze', icon: Zap, color: 'orange' },
                    { id: 'lossless', title: 'Lossless', desc: 'Structure Only', icon: Shield, color: 'emerald' }
                ].map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => setSettings({ ...settings, mode: mode.id as CompressionMode })}
                        className={cn(
                            "p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
                            settings.mode === mode.id
                                ? `bg-${mode.color}-500/10 border-${mode.color}-500 shadow-lg shadow-${mode.color}-500/10`
                                : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl transition-colors", settings.mode === mode.id ? `bg-${mode.color}-500 text-white` : "bg-slate-800 text-slate-500")}>
                                <mode.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">{mode.title}</h4>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{mode.desc}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="pt-4 border-t border-white/5">
                <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Strip Metadata</span>
                    <div
                        className={`w-10 h-5 rounded-full relative transition-colors ${settings.stripMetadata ? 'bg-indigo-600' : 'bg-slate-700'}`}
                        onClick={() => setSettings({ ...settings, stripMetadata: !settings.stripMetadata })}
                    >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.stripMetadata ? 'left-6' : 'left-1'}`} />
                    </div>
                </label>
            </div>
        </div>
    );

    const handleCompress = async (file: File, settings: CompressSettings) => {
        const fileData = await file.arrayBuffer();
        const result = await globalWorkerPool.runTask<Uint8Array>('COMPRESS_PDF', {
            fileData,
            options: {
                mode: settings.mode,
                stripMetadata: settings.stripMetadata
            }
        });
        return new Blob([result as any], { type: 'application/pdf' });
    };

    return (
        <TransformerShell<CompressSettings>
            tool={tool}
            engine={handleCompress}
            initialSettings={initialSettings}
            renderSettings={renderSettings}
            successMessage="Semantic Compression Complete"
            downloadLabel="Download Optimized PDF"
        />
    );
}

export function CompressTool() {
    return (
        <Suspense fallback={<div className="py-20 text-center text-slate-500">Initializing Smart Squeeze...</div>}>
            <CompressToolContent />
        </Suspense>
    );
}

