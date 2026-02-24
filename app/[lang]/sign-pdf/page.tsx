'use client';

import React from 'react';
import { SignTool } from '@/components/tools/SignTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';
import { ShieldCheck } from 'lucide-react';

export default function SignPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="signPdf"
                title="Docu-Pro Secure Signer"
                description="Professional-grade signing with legislative audit trails and vector-fidelity capture."
                icon={ShieldCheck}
                color="from-navy-900 via-indigo-900 to-blue-800"
            />

            <ToolContent>
                <SignTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/sign-pdf']} />
                <RelatedTools currentToolId="signPdf" />
            </div>
        </div>
    );
}
