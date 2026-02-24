'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { WordToPdfTool } from '@/components/tools/WordToPdfTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function WordToPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="wordToPdf"
                title="Professional Word to PDF"
                description="High-fidelity reconstruction: convert Office documents to PDF with vector accuracy and layout preservation."
                icon={FileText}
                color="from-blue-500 to-indigo-600"
            />

            <ToolContent>
                <WordToPdfTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides.wordToPdf} />
                <RelatedTools currentToolId="wordToPdf" />
            </div>
        </div>
    );
}
