/* eslint-disable */
'use client';

import React from 'react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function ExcelToPdfTool() {
    const tool = tools.find(t => t.id === 'excelToPdf')!;

    const handleConvert = async (file: File) => {
        const fileData = await file.arrayBuffer();
        const result = await globalWorkerPool.runTask<Uint8Array>('EXCEL_TO_PDF', {
            fileData,
            options: { orientation: 'p', sheets: 'all', preserveStyles: true }
        });
        return new Blob([result as any], { type: 'application/pdf' });
    };

    return (
        <TransformerShell
            tool={tool}
            engine={handleConvert}
            accept={{
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                'application/vnd.ms-excel': ['.xls']
            }}
            successMessage="Spreadsheet Successfully Converted"
        />
    );
}

