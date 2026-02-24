'use client';

import React from 'react';
import { Unlock } from 'lucide-react';
import { UnlockTool } from '@/components/tools/UnlockTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function UnlockPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="unlockPdf"
                title="Bunker Breach"
                description="Secure Decryption: Remove passwords and permission restrictions from protected PDFs using local zero-knowledge processing."
                icon={Unlock}
                color="from-green-600 to-emerald-600"
            />

            <ToolContent>
                <UnlockTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/unlock-pdf']} />
                <RelatedTools currentToolId="unlockPdf" />
            </div>
        </div>
    );
}
