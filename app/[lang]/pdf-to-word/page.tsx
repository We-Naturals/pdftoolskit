'use client';

import React from 'react';
import { FileEdit } from 'lucide-react';
import { PDFToWordTool } from '@/components/tools/PDFToWordTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function PDFToWordPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="pdfToWord"
                title="Intelligent PDF to Word"
                description="Professional conversion: reconstruction of text layouts with high-fidelity formatting preservation."
                icon={FileEdit}
                color="from-indigo-500 to-purple-600"
            />

            <ToolContent>
                <PDFToWordTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/pdf-to-word']} />
                <RelatedTools currentToolId="pdfToWord" />
            </div>
        </div>
    );
}
