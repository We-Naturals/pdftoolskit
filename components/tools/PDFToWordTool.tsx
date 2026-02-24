/* eslint-disable */
'use client';

import React, { Suspense } from 'react';
import { FileType } from 'lucide-react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';
import { getBaseFileName } from '@/lib/utils';
import toast from 'react-hot-toast';

import { apexService } from '@/lib/services/apex-service';

function PDFToWordContent() {
    const tool = tools.find(t => t.id === 'pdfToWord')!;

    const handleConvert = async (file: File) => {
        const data = await apexService.pdfToOffice(file, 'docx');

        return new Blob([data] as any, {
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
