'use client';

import React from 'react';
import { Droplet } from 'lucide-react';
import { WatermarkTool } from '@/components/tools/WatermarkTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function AddWatermarkPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="addWatermark"
                title="Visual Watermark Engine"
                description="Secure your intellectual property with industrial-grade watermarking. Place, style, and tile custom text overlays with real-time interactive positioning."
                icon={Droplet}
                color="from-indigo-600 to-violet-500"
            />

            <ToolContent>
                <WatermarkTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/add-watermark']} />
                <RelatedTools currentToolId="addWatermark" />
            </div>
        </div>
    );
}
