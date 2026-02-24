
'use client';

import { Camera } from 'lucide-react';
import { toolGuides } from '@/data/guides';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { ToolContent } from '@/components/shared/ToolContent';
import { InstaScan } from '@/components/shared/InstaScan';
import { ToolHeader } from '@/components/shared/ToolHeader';

export default function InstaScanPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-4xl">
            <ToolHeader
                toolId="scanPdf"
                title="Insta-Scan"
                description="60FPS WebGPU-accelerated real-time document capture"
                icon={Camera}
                color="from-blue-500 to-indigo-600"
            />

            <InstaScan />

            <QuickGuide steps={toolGuides['/insta-scan']} />
            <ToolContent toolName="/insta-scan" />
            <RelatedTools currentToolId="scanPdf" />
        </div>
    );
}
