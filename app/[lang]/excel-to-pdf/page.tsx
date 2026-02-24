'use client';

import React from 'react';
import { FileCode2 } from 'lucide-react';
import { ExcelToPdfTool } from '@/components/tools/ExcelToPdfTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function ExcelToPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="excelToPdf"
                title="Excel to PDF Converter"
                description="Professional Spreadsheet Serialization: Convert Excel files (XLSX, XLS) into perfectly formatted PDF documents while maintaining data integrity."
                icon={FileCode2}
                color="from-green-500 to-teal-600"
            />

            <ToolContent>
                <ExcelToPdfTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides.excelToPdf} />
                <RelatedTools currentToolId="excelToPdf" />
            </div>
        </div>
    );
}
