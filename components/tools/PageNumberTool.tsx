/* eslint-disable */
'use client';

import React from 'react';
import { LayoutTemplate, Hash, ArrowRightLeft } from 'lucide-react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';
import { addPageNumbers } from '@/lib/pdf-utils';
import { cn } from '@/lib/utils';

type Position = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface PageNumberSettings {
    position: Position;
    startFrom: number;
    textPattern: string;
    margin: number;
    mirror: boolean;
}

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function PageNumberTool() {
    const tool = tools.find(t => t.id === 'addPageNumbers')!;

    const handleApply = async (file: File, settings: PageNumberSettings) => {
        const fileData = await file.arrayBuffer();
        const result = await globalWorkerPool.runTask<Uint8Array>('ADD_PAGE_NUMBERS', {
            fileData,
            options: {
                position: settings.position,
                startFrom: settings.startFrom,
                textPattern: settings.textPattern,
                margin: settings.margin,
                mirror: settings.mirror
            }
        });

        return new Blob([result as any], { type: 'application/pdf' });
    };

    const renderSettings = (settings: PageNumberSettings, setSettings: (s: PageNumberSettings) => void) => {
        const PositionButton = ({ pos, label }: { pos: Position; label: string }) => (
            <button
                onClick={() => setSettings({ ...settings, position: pos })}
                className={cn(
                    "p-3 rounded-xl border flex flex-col items-center justify-center transition-all group relative",
                    settings.position === pos
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105"
                        : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                )}
            >
                <div className={cn(
                    "w-8 h-10 border-2 rounded-md relative mb-2 transition-colors",
                    settings.position === pos ? "border-white/40" : "border-slate-700 group-hover:border-slate-600"
                )}>
                    <span className={cn(
                        "absolute text-[10px] font-black",
                        pos.includes('top') ? "top-1" : "bottom-1",
                        pos.includes('left') ? "left-1" : pos.includes('right') ? "right-1" : "left-1/2 -translate-x-1/2"
                    )}>#</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
            </button>
        );

        return (
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                        <LayoutTemplate className="w-3 h-3 text-indigo-400" /> Position Grid
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        <PositionButton pos="top-left" label="TL" />
                        <PositionButton pos="top-center" label="TC" />
                        <PositionButton pos="top-right" label="TR" />
                        <PositionButton pos="bottom-left" label="BL" />
                        <PositionButton pos="bottom-center" label="BC" />
                        <PositionButton pos="bottom-right" label="BR" />
                    </div>
                </div>

                <div className="flex bg-slate-900 shadow-inner p-4 rounded-xl border border-slate-800 items-center justify-between">
                    <div>
                        <p className="text-white text-xs font-bold mb-0.5">Mirror (Book Mode)</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Double-sided optimization</p>
                    </div>
                    <button
                        onClick={() => setSettings({ ...settings, mirror: !settings.mirror })}
                        className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            settings.mirror ? "bg-indigo-600" : "bg-slate-700"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                            settings.mirror ? "translate-x-6" : "translate-x-0"
                        )} />
                    </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                            <Hash className="w-3 h-3 text-indigo-400" /> Text Pattern
                        </label>
                        <input
                            type="text"
                            value={settings.textPattern}
                            onChange={(e) => setSettings({ ...settings, textPattern: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold"
                            placeholder="{n}"
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => setSettings({ ...settings, textPattern: settings.textPattern + "{total}" })}
                                className="px-2 py-1 text-[9px] font-black bg-slate-900 text-slate-500 border border-slate-800 rounded-lg hover:border-slate-700 uppercase"
                            >
                                + Total
                            </button>
                            <button
                                onClick={() => setSettings({ ...settings, textPattern: "Page {n} of {total}" })}
                                className="px-2 py-1 text-[9px] font-black bg-slate-900 text-slate-500 border border-slate-800 rounded-lg hover:border-slate-700 uppercase"
                            >
                                Preset
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Start At</label>
                            <input
                                type="number"
                                min="1"
                                value={settings.startFrom}
                                onChange={(e) => setSettings({ ...settings, startFrom: parseInt(e.target.value) || 1 })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Margin (px)</label>
                            <input
                                type="number"
                                min="0"
                                max="200"
                                value={settings.margin}
                                onChange={(e) => setSettings({ ...settings, margin: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <TransformerShell<PageNumberSettings>
            tool={tool}
            engine={handleApply}
            initialSettings={{
                position: 'bottom-center',
                startFrom: 1,
                textPattern: '{n}',
                margin: 20,
                mirror: false
            }}
            renderSettings={renderSettings}
            successMessage="Document Indexed Successfully"
        />
    );
}

