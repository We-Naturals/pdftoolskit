'use client';

import React from 'react';
import { GripVertical } from 'lucide-react';
import { OrganizeTool } from '@/components/tools/OrganizeTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function OrganizePDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="organizePdf"
                title="Organize PDF"
                description="The master control: reorder, delete, and manage your document layout with a visual grid."
                icon={GripVertical}
                color="from-cyan-500 to-blue-500"
            />

            <ToolContent>
                <OrganizeTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/organize-pdf']} />
                <RelatedTools currentToolId="organizePdf" />
            </div>
        </div>
    );
}
