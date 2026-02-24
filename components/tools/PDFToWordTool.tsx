/* eslint-disable */
'use client';

import React, { Suspense } from 'react';
import { FileType } from 'lucide-react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';
import { getBaseFileName } from '@/lib/utils';
import toast from 'react-hot-toast';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

function PDFToWordContent() {
    const tool = tools.find(t => t.id === 'pdfToWord')!;

    const handleConvert = async (file: File) => {
        const fileData = await file.arrayBuffer();
        const { data, isScanned } = await globalWorkerPool.runTask<{ data: Uint8Array, isScanned: boolean }>('PDF_TO_WORD', {
            fileData
        });

        if (isScanned) {
            toast.success("Detected scanned PDF. Used OCR for better results.");
        }

        return new Blob([data as any], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    };

    return (
        <TransformerShell
            tool={tool}
            engine={handleConvert}
            successMessage="Conversion Complete!"
            downloadLabel="Download Word Doc"
        />
    );
}

export function PDFToWordTool() {
    return (
        <Suspense fallback={<div className="py-20 text-center text-slate-500">Initializing Converter...</div>}>
            <PDFToWordContent />
        </Suspense>
    );
}
