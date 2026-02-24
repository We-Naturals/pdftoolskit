'use client';

import React from 'react';
import { FileImage } from 'lucide-react';
import { ImageToPdfTool } from '@/components/tools/ImageToPdfTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function JPGtoPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="jpgToPdf"
                title="JPG to Professional PDF"
                description="Asset Convergence: Transform multiple images into a standardized PDF document with intelligent reordering and auto-alignment."
                icon={FileImage}
                color="from-indigo-500 to-purple-500"
            />

            <ToolContent>
                <ImageToPdfTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/jpg-to-pdf']} />
                <RelatedTools currentToolId="jpgToPdf" />
            </div>
        </div>
    );
}
