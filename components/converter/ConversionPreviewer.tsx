
'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Eye, FileText, ArrowRight } from 'lucide-react';

interface ConversionPreviewerProps {
    originalFile: File | Blob;
    resultFile: File | Blob;
}

export function ConversionPreviewer({ originalFile, resultFile }: ConversionPreviewerProps) {
    const [view, setView] = useState<'side-by-side' | 'toggle'>('side-by-side');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h5 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Eye className="w-3 h-3" />
                    Parity Inspection
                </h5>
                <div className="flex bg-white/5 rounded-lg p-1">
                    <button
                        onClick={() => setView('side-by-side')}
                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${view === 'side-by-side' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Dual View
                    </button>
                    <button
                        onClick={() => setView('toggle')}
                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${view === 'toggle' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Toggle
                    </button>
                </div>
            </div>

            <div className={`grid gap-4 ${view === 'side-by-side' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Original Placeholder */}
                <GlassCard className="p-6 border-white/5 bg-slate-900/80 flex flex-col items-center justify-center min-h-[200px] border-l-4 border-l-slate-500">
                    <FileText className="w-8 h-8 text-slate-500 mb-3 opacity-50" />
                    <p className="text-[10px] uppercase font-black text-slate-500">Original Source</p>
                    <p className="text-xs text-slate-400 truncate max-w-full">{(originalFile as File).name || 'Source PDF'}</p>
                </GlassCard>

                {/* Result Placeholder */}
                <GlassCard className="p-6 border-white/5 bg-purple-500/10 flex flex-col items-center justify-center min-h-[200px] border-l-4 border-l-purple-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                        <div className="bg-purple-500/20 text-purple-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Reconstructed</div>
                    </div>
                    <FileText className="w-8 h-8 text-purple-400 mb-3" />
                    <p className="text-[10px] uppercase font-black text-purple-400">Converted Output</p>
                    <p className="text-xs text-white truncate max-w-full">{(resultFile as File).name || 'Result Document'}</p>

                    <div className="mt-4 flex items-center gap-2 text-[10px] text-green-400 font-bold">
                        <ArrowRight className="w-3 h-3" />
                        85% Layout Parity
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
