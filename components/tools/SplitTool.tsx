/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { Scissors } from 'lucide-react';
import toast from 'react-hot-toast';
import { ManipulatorShell } from '@/components/shells/ManipulatorShell';
import { SplitService } from '@/lib/services/pdf/splitService';
import { tools } from '@/data/tools';
import { cn } from '@/lib/utils';
import { SplitGrid } from './SplitGrid';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

type SplitMode = 'manual' | 'interval' | 'range';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function SplitTool() {
    const tool = tools.find(t => t.id === 'splitPdf')!;
    const [splitMode, setSplitMode] = useState<SplitMode>('manual');
    const [intervalValue, setIntervalValue] = useState<number>(1);
    const [rangeValue, setRangeValue] = useState<string>('');
    const [splitPoints, setSplitPoints] = useState<number[]>([]);

    const toggleSplitPoint = (pageIndex: number) => {
        setSplitPoints(prev => {
            if (prev.includes(pageIndex)) {
                return prev.filter(p => p !== pageIndex).sort((a, b) => a - b);
            } else {
                return [...prev, pageIndex].sort((a, b) => a - b);
            }
        });
    };

    const getRangesFromSplitPoints = (total: number, points: number[]): string => {
        const ranges: string[] = [];
        let start = 1;
        points.forEach(pointIndex => {
            const end = pointIndex + 1;
            ranges.push(`${start}-${end}`);
            start = end + 1;
        });
        if (start <= total) ranges.push(`${start}-${total}`);
        return ranges.join(', ');
    };

    const handleSplit = async (pages: any[], fileMap: Map<string, File>) => {
        const fileObj = Array.from(fileMap.values())[0];
        if (!fileObj) throw new Error("No file found");

        let options: any = { mode: splitMode };
        if (splitMode === 'manual') {
            if (splitPoints.length === 0) throw new Error("Please add at least one cut line.");
            options = { mode: 'range', ranges: getRangesFromSplitPoints(pages.length, splitPoints) };
        } else if (splitMode === 'interval') {
            options = { mode: 'interval', interval: intervalValue };
        } else if (splitMode === 'range') {
            options = { mode: 'range', ranges: rangeValue };
        }

        const fileData = await fileObj.arrayBuffer();
        const result = await globalWorkerPool.runTask<Uint8Array>('SPLIT_PDF', {
            fileData,
            settings: options
        });

        return new Blob([result as any], { type: 'application/zip' });
    };

    const renderActionPanel = (pages: any[], files: any[], handleExecute: () => void) => (
        <GlassCard className="p-8 border-indigo-500/30 bg-indigo-500/5 items-center flex flex-col justify-center h-full min-h-[400px]">
            <Scissors className="w-12 h-12 text-indigo-400 mb-6 animate-pulse" />
            <h4 className="text-xl font-bold text-white mb-6 text-center">Split Settings</h4>

            <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 mb-8 w-full">
                {(['manual', 'interval', 'range'] as SplitMode[]).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setSplitMode(mode)}
                        className={cn(
                            "flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                            splitMode === mode ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        {mode === 'manual' ? 'Visual' : mode}
                    </button>
                ))}
            </div>

            {splitMode === 'interval' && (
                <div className="flex items-center gap-3 mb-8 w-full justify-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Every</span>
                    <input
                        type="number"
                        min="1"
                        max={pages.length}
                        value={intervalValue}
                        onChange={(e) => setIntervalValue(parseInt(e.target.value) || 1)}
                        className="w-16 bg-slate-950 border border-white/5 rounded-lg px-2 py-2 text-white text-center font-bold focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Pages</span>
                </div>
            )}

            {splitMode === 'range' && (
                <div className="w-full mb-8">
                    <input
                        type="text"
                        placeholder="e.g. 1-5, 8, 10-12"
                        value={rangeValue}
                        onChange={(e) => setRangeValue(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-white text-xs focus:border-indigo-500 focus:outline-none"
                    />
                </div>
            )}

            <div className="w-full space-y-3 mb-8">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black">
                    <span>Target Documents</span>
                    <span className="text-indigo-400">
                        {splitMode === 'manual' ? splitPoints.length + 1 : 'Auto'}
                    </span>
                </div>
            </div>

            <Button
                variant="primary"
                onClick={handleExecute}
                disabled={pages.length === 0 || (splitMode === 'manual' && splitPoints.length === 0)}
                size="lg"
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 rounded-2xl flex items-center justify-center gap-3"
            >
                <Scissors className="w-5 h-5" />
                Process Split
            </Button>
        </GlassCard>
    );

    const renderGrid = (pages: any[], files: any[]) => {
        if (splitMode === 'manual') {
            return (
                <div className="h-full w-full relative">
                    <SplitGrid splitPoints={splitPoints} onToggleSplit={toggleSplitPoint} />
                </div>
            );
        }
        return (
            <div className="h-full w-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]">
                <div className="text-center">
                    <Scissors className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-sm max-w-xs">
                        {splitMode === 'interval'
                            ? `Splitting document every ${intervalValue} page(s).`
                            : "Extracting specific page ranges."}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <ManipulatorShell
            tool={tool}
            onAction={handleSplit}
            renderGrid={renderGrid}
            renderActionPanel={renderActionPanel}
            successMessage="Extraction Complete!"
        />
    );
}
