'use client';

import React from 'react';
import { Presentation } from 'lucide-react';
import { PowerPointToPdfTool } from '@/components/tools/PowerPointToPdfTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function PowerPointToPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="powerPointToPdf"
                title="PowerPoint to PDF"
                description="High-Fidelity Slide Reconstruction: Convert presentations (PPTX) into polished, vector-accurate PDF documents with intelligent spatial mapping."
                icon={Presentation}
                color="from-red-500 to-orange-600"
            />

            <ToolContent>
                <PowerPointToPdfTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/powerpoint-to-pdf']} />
                <RelatedTools currentToolId="powerPointToPdf" />
            </div>
        </div>
    );
}
