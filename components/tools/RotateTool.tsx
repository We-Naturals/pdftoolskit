/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { RotateCcw, Download, Sparkles, Ruler, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ManipulatorShell } from '@/components/shells/ManipulatorShell';
import { RotateService } from '@/lib/services/pdf/rotateService';
import { tools } from '@/data/tools';
import { cn } from '@/lib/utils';
import { PDFGrid } from '@/components/pdf/PDFGrid';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function RotateTool() {
    const tool = tools.find(t => t.id === 'rotatePdf')!;
    const [rotations, setRotations] = useState<Record<number, number>>({});
    const [fineRotations, setFineRotations] = useState<Record<number, number>>({});
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [showGrid, setShowGrid] = useState(false);

    const handleRotate = async (pages: any[], fileMap: Map<string, File>) => {
        const fileIds = Array.from(new Set(pages.map(p => p.fileId)));
        const fileDatas: Record<string, ArrayBuffer> = {};

        for (const fid of fileIds) {
            const file = fileMap.get(fid);
            if (file) {
                fileDatas[fid] = await file.arrayBuffer();
            }
        }

        // We use the 'ORGANIZE_PDF' task because it already handles per-page rotation logic
        const result = await globalWorkerPool.runTask<Uint8Array>('ORGANIZE_PDF', { pages, fileDatas });
        return new Blob([result as any], { type: 'application/pdf' });
    };

    const rotateSelected = (angle: number) => {
        setRotations(prev => {
            const next = { ...prev };
            if (selectedPages.length === 0) {
                // Apply to all if none selected loop would be here, but let's keep it simple
            } else {
                selectedPages.forEach(p => {
                    next[p - 1] = ((next[p - 1] || 0) + angle + 360) % 360;
                });
            }
            return next;
        });
    };

    const renderActionPanel = (pages: any[], files: any[], handleExecute: () => void) => (
        <GlassCard className="p-6 border-rose-500/20 bg-rose-500/5 h-full">
            <h4 className="text-xl font-bold text-white mb-6">Rotate Controls</h4>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <Button variant="secondary" onClick={() => rotateSelected(-90)} className="text-xs h-12">
                    <RotateCcw className="w-4 h-4 mr-2" /> -90°
                </Button>
                <Button variant="secondary" onClick={() => rotateSelected(90)} className="text-xs h-12">
                    <RotateCcw className="w-4 h-4 mr-2 rotate-180" /> +90°
                </Button>
            </div>

            <div className="space-y-4 mb-8">
                <Button variant="ghost" size="sm" onClick={() => setShowGrid(!showGrid)} className="w-full text-[10px] uppercase font-bold tracking-widest border border-white/5">
                    {showGrid ? 'Hide Layout Grid' : 'Show Layout Grid'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setRotations({}); setFineRotations({}); }} className="w-full text-red-400 text-[10px] uppercase font-bold">
                    Reset All
                </Button>
            </div>

            <Button
                variant="primary"
                onClick={handleExecute}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 shadow-xl shadow-rose-600/20"
            >
                Process & Save
            </Button>
        </GlassCard>
    );

    const renderGrid = (pages: any[], files: any[]) => {
        const fileObj = Array.from(files)[0] as any;
        return (
            <div className="h-full w-full overflow-y-auto p-4 custom-scrollbar">
                <PDFGrid
                    file={fileObj}
                    pageCount={pages.length}
                    selectedPages={selectedPages}
                    rotations={rotations}
                    fineRotations={fineRotations}
                    showGrid={showGrid}
                    onPageClick={(idx) => {
                        const pNum = idx + 1;
                        setSelectedPages(prev => prev.includes(pNum) ? prev.filter(p => p !== pNum) : [...prev, pNum]);
                    }}
                    onPageRotate={(idx) => {
                        setRotations(prev => ({ ...prev, [idx]: ((prev[idx] || 0) + 90) % 360 }));
                    }}
                />
            </div>
        );
    };

    return (
        <ManipulatorShell
            tool={tool}
            onAction={handleRotate}
            renderGrid={renderGrid}
            renderActionPanel={renderActionPanel}
        />
    );
}
