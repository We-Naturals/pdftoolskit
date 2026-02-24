/* eslint-disable */
'use client';

import React from 'react';
import { ManipulatorShell } from '@/components/shells/ManipulatorShell';
import { tools } from '@/data/tools';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function MergeTool() {
    const tool = tools.find(t => t.id === 'mergePdf')!;

    const handleMerge = async (pages: any[], fileMap: Map<string, File>) => {
        const fileIds = Array.from(new Set(pages.map(p => p.fileId)));
        const fileDatas: Record<string, ArrayBuffer> = {};

        for (const fid of fileIds) {
            const file = fileMap.get(fid);
            if (file) {
                fileDatas[fid] = await file.arrayBuffer();
            }
        }

        const result = await globalWorkerPool.runTask<Uint8Array>('ORGANIZE_PDF', { pages, fileDatas });
        return new Blob([result as any], { type: 'application/pdf' });
    };

    return (
        <ManipulatorShell
            tool={tool}
            onAction={handleMerge}
            actionLabel="Merge Documents"
            successMessage="Documents Unified Successfully"
        />
    );
}

