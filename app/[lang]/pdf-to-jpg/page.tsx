'use client';

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { PdfToImageTool } from '@/components/tools/PdfToImageTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function PDFtoJPGPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="pdfToJpg"
                title="PDF to High-Quality Image"
                description="Professional Rasterization: Convert PDF pages into high-fidelity JPG, PNG, or WebP images with customizable DPI density."
                icon={ImageIcon}
                color="from-orange-500 to-red-500"
            />

            <ToolContent>
                <PdfToImageTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/pdf-to-jpg']} />
                <RelatedTools currentToolId="pdfToJpg" />
            </div>
        </div>
    );
}
