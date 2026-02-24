/* eslint-disable */
'use client';

import React from 'react';
import { Sparkles, FileText, CheckCircle } from 'lucide-react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';
import { cn } from '@/lib/utils';

interface PptSettings {
    mode: 'vivid' | 'structure';
}

import { apexService } from '@/lib/services/apex-service';

export function PowerPointToPdfTool() {
    const tool = tools.find(t => t.id === 'powerPointToPdf')!;

    const handleConvert = async (file: File) => {
        // Apex natively handles PPTX vividly
        const result = await apexService.officeToPdf(file);
        return new Blob([result] as any, { type: 'application/pdf' });
    };

    const renderSettings = (settings: PptSettings, setSettings: (s: PptSettings) => void) => (
        <div className="space-y-4">
            <button
                onClick={() => setSettings({ ...settings, mode: 'vivid' })}
                className={cn(
                    "w-full p-4 rounded-xl border transition-all text-left relative overflow-hidden group",
                    settings.mode === 'vivid' ? "bg-red-600 border-red-500 shadow-lg shadow-red-600/20" : "bg-slate-900/50 border-white/5 hover:border-white/10"
                )}
            >
                <div className="flex items-center gap-3 mb-2">
                    <Sparkles className={cn("w-4 h-4", settings.mode === 'vivid' ? "text-white" : "text-orange-500")} />
                    <span className={cn("font-bold text-xs", settings.mode === 'vivid' ? "text-white" : "text-slate-200")}>Vivid Reconstruction</span>
                </div>
                <p className={cn("text-[9px] leading-relaxed", settings.mode === 'vivid' ? "text-red-100" : "text-slate-500")}>
                    Preserves spatial positioning, background images, and vector assets.
                </p>
                {settings.mode === 'vivid' && <CheckCircle className="absolute top-2 right-2 w-3 h-3 text-white" />}
            </button>

            <button
                onClick={() => setSettings({ ...settings, mode: 'structure' })}
                className={cn(
                    "w-full p-4 rounded-xl border transition-all text-left relative overflow-hidden group",
                    settings.mode === 'structure' ? "bg-slate-700 border-slate-600 shadow-lg shadow-slate-600/20" : "bg-slate-900/50 border-white/5 hover:border-white/10"
                )}
            >
                <div className="flex items-center gap-3 mb-2">
                    <FileText className={cn("w-4 h-4", settings.mode === 'structure' ? "text-white" : "text-slate-400")} />
                    <span className={cn("font-bold text-xs", settings.mode === 'structure' ? "text-white" : "text-slate-200")}>Clean Extraction</span>
                </div>
                <p className={cn("text-[9px] leading-relaxed", settings.mode === 'structure' ? "text-slate-100" : "text-slate-500")}>
                    Focuses on text flow and document structure. Grayscale optimized.
                </p>
                {settings.mode === 'structure' && <CheckCircle className="absolute top-2 right-2 w-3 h-3 text-white" />}
            </button>
        </div>
    );

    return (
        <TransformerShell<PptSettings>
            tool={tool}
            engine={handleConvert}
            initialSettings={{ mode: 'vivid' }}
            renderSettings={renderSettings}
            accept={{
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
            }}
            successMessage="Presentation Reconstructed as PDF"
        />
    );
}
