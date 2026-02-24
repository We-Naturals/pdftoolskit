'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { ProtectTool } from '@/components/tools/ProtectTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function ProtectPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="protectPdf"
                title="Security Bunker"
                description="AES-256 Grade Encryption: Secure your sensitive documents with military-grade passwords and granular permission controls."
                icon={Lock}
                color="from-red-600 to-orange-600"
            />

            <ToolContent>
                <ProtectTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/protect-pdf']} />
                <RelatedTools currentToolId="protectPdf" />
            </div>
        </div>
    );
}
