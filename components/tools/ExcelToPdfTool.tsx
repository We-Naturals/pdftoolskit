/* eslint-disable */
'use client';

import React from 'react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';

import { apexService } from '@/lib/services/apex-service';


export function ExcelToPdfTool() {
    const tool = tools.find(t => t.id === 'excelToPdf')!;

    const handleConvert = async (file: File) => {
        const result = await apexService.officeToPdf(file);
        return new Blob([result] as any, { type: 'application/pdf' });
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

