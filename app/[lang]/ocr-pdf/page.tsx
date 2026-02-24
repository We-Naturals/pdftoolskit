'use client';

import React from 'react';
import { Brain } from 'lucide-react';
import { OcrTool } from '@/components/tools/OcrTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function OCRPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="ocrPdf"
                title="Hyper-Vision OCR Engine"
                description="Industrial-grade text extraction: Utilize multi-threaded neural processing to convert scanned documents and images into editable text and searchable PDFs."
                icon={Brain}
                color="from-teal-400 to-emerald-500"
            />

            <ToolContent>
                <OcrTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/ocr-pdf']} />
                <RelatedTools currentToolId="ocrPdf" />
            </div>
        </div>
    );
}
