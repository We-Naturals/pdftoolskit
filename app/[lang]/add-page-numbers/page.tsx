'use client';

import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { PageNumberTool } from '@/components/tools/PageNumberTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function AddPageNumbersPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="addPageNumbers"
                title="Page Indexing Engine"
                description="Professional Document Serialization: Insert customizable page numbers with intelligent positioning, book-mode mirroring, and dynamic text patterns."
                icon={LayoutTemplate}
                color="from-emerald-500 to-teal-600"
            />

            <ToolContent>
                <PageNumberTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/add-page-numbers']} />
                <RelatedTools currentToolId="addPageNumbers" />
            </div>
        </div>
    );
}
