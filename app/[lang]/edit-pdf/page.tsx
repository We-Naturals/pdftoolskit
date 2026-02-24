'use client';

import React from 'react';
import { EditTool } from '@/components/tools/EditTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';
import { PenTool } from 'lucide-react';

export default function EditPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="editPdf"
                title="Pro-Fidelity Vector Editor"
                description="Edit PDF text, images, and shapes with full vector precision and high-performance rendering."
                icon={PenTool}
                color="from-blue-600 via-indigo-600 to-indigo-800"
            />

            <ToolContent>
                <EditTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/edit-pdf']} />
                <RelatedTools currentToolId="editPdf" />
            </div>
        </div>
    );
}
