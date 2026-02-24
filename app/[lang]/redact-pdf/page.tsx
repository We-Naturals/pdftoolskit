'use client';

import React from 'react';
import { EyeOff } from 'lucide-react';
import { RedactTool } from '@/components/tools/RedactTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function RedactPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="redactPdf"
                title="Visual Redactor"
                description="Professional-grade sanitization: permanently remove sensitive information and PII from your documents."
                icon={EyeOff}
                color="from-gray-800 to-black"
            />

            <ToolContent>
                <RedactTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/redact-pdf']} />
                <RelatedTools currentToolId="redactPdf" />
            </div>
        </div>
    );
}
