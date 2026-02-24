/* eslint-disable */
'use client';

import React from 'react';
import { GripVertical, Download, BrainCircuit } from 'lucide-react';
import { ManipulatorShell } from '@/components/shells/ManipulatorShell';
import { tools } from '@/data/tools';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function OrganizeTool() {
    const tool = tools.find(t => t.id === 'organizePdf')!;

    const handleSmartSort = async (pages: any[], setPages: (p: any[]) => void, files: any[]) => {
        const fileDatas: Record<string, ArrayBuffer> = {};
        for (const f of files) {
            fileDatas[f.id] = await f.file.arrayBuffer();
        }

        const analysis = await globalWorkerPool.runTask<any[]>('ANALYZE_PAGES', { fileDatas });

        const sorted = [...pages].sort((a, b) => {
            const anaA = analysis.find(m => m.fileId === a.fileId && m.pageIndex === a.pageIndex);
            const anaB = analysis.find(m => m.fileId === b.fileId && m.pageIndex === b.pageIndex);
            const topicA = anaA?.topic || 'General';
            const topicB = anaB?.topic || 'General';
            return topicA.localeCompare(topicB);
        });

        setPages(sorted);
    };

    const handleAction = async (pages: any[], fileMap: Map<string, File>) => {
        const fileDatas: Record<string, ArrayBuffer> = {};
        const fileIds = Array.from(new Set(pages.map(p => p.fileId)));

        for (const fid of fileIds) {
            const file = fileMap.get(fid);
            if (file) fileDatas[fid] = await file.arrayBuffer();
        }

        const result = await globalWorkerPool.runTask<Uint8Array>('ORGANIZE_PDF', { pages, fileDatas });
        return result;
    };

    return (
        <ManipulatorShell
            tool={tool}
            onAction={handleAction}
            renderActionPanel={(pages, files, execute, setPages) => {
                return (
                    <GlassCard className="p-6 border-cyan-500/20 bg-cyan-500/5 h-full flex flex-col justify-center">
                        <div className="text-center mb-8">
                            <GripVertical className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
                            <h4 className="text-xl font-bold text-white uppercase tracking-tight">Organize Mode</h4>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Drag and drop pages to reorder. Delete pages you don&apos;t need.
                            </p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between text-[10px] text-slate-500 uppercase font-black">
                                <span>Final Page Count</span>
                                <span className="text-cyan-400">{pages.length}</span>
                            </div>
                        </div>

                        <Button
                            variant="secondary"
                            onClick={() => handleSmartSort(pages, setPages, files)}
                            className="w-full mb-3 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                            icon={<BrainCircuit className="w-5 h-5" />}
                        >
                            AI SMART SORT
                        </Button>

                        <Button
                            variant="primary"
                            onClick={execute}
                            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 shadow-xl shadow-cyan-600/20"
                            icon={<Download className="w-5 h-5" />}
                        >
                            Build PDF
                        </Button>
                    </GlassCard>
                );
            }}
        />
    );
}
