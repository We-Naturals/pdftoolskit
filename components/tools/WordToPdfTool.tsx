/* eslint-disable */
'use client';

import React from 'react';
import { FileText, Sparkles, Layout, Zap } from 'lucide-react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';
import { GlassCard } from '@/components/ui/GlassCard';

import { apexService } from '@/lib/services/apex-service';

export function WordToPdfTool() {
    const tool = tools.find(t => t.id === 'wordToPdf')!;

    const handleConvert = async (file: File) => {
        const result = await apexService.officeToPdf(file, {
            initialView: 'FitWidth',
            imageCompression: 90,
            pageRange: 'all'
        });
        return new Blob([result] as any, { type: 'application/pdf' });
    };

    const renderOptions = () => (
        <div className="space-y-6">
            <GlassCard className="p-6 border-blue-500/20 bg-blue-500/5">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    Render Matrix
                </h3>
                <div className="space-y-4">
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                        <p className="text-xs font-bold text-white mb-1">Vector Re-composition</p>
                        <p className="text-[10px] text-slate-500 uppercase">Ensures sharp text at any zoom</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                        <p className="text-xs font-bold text-white mb-1">Image Upscaling</p>
                        <p className="text-[10px] text-slate-500 uppercase">Auto-enhancement for embedded jpgs</p>
                    </div>
                </div>
            </GlassCard>

            <div className="flex justify-center gap-6 mt-8">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                    <Zap className="w-3 h-3 text-blue-500" />
                    Vector Scaling
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest">
                    <Layout className="w-3 h-3 text-blue-500" />
                    Style Embedding
                </span>
            </div>
        </div>
    );

    return (
        <TransformerShell
            tool={tool}
            engine={handleConvert}
            renderSettings={renderOptions}
            accept={{
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'application/msword': ['.doc']
            }}
        />
    );
}
