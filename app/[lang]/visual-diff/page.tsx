
'use client';

import { DiffTool } from '@/components/tools/DiffTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';
import { Layers } from 'lucide-react';

export default function VisualDiffPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                title="Visual Diff IQ"
                description="Advanced comparison engine with vector overlay, split-curtain, and side-by-side synchronization."
                icon={Layers}
                toolId="visual-diff"
                color="from-cyan-500 via-blue-600 to-indigo-700"
            />

            <ToolContent>
                <DiffTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/visual-diff']} />
                <RelatedTools currentToolId="visual-diff" />
            </div>
        </div>
    );
}
