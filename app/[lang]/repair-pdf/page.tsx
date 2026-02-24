'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { RepairTool } from '@/components/tools/RepairTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { ToolContent } from '@/components/shared/ToolContent';
import { RelatedTools } from '@/components/shared/RelatedTools';
import { QuickGuide } from '@/components/shared/QuickGuide';
import { toolGuides } from '@/data/guides';

export default function RepairPDFPage() {
    return (
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-7xl">
            <ToolHeader
                toolId="repairPdf"
                title="Forensic PDF Repair"
                description="Advanced Document Recovery: Utilize industrial-grade structural analysis to rebuild corrupted XRef tables, recover orphaned objects, and sanitize malformed data streams."
                icon={ShieldCheck}
                color="from-emerald-600 to-teal-500"
            />

            <ToolContent>
                <RepairTool />
            </ToolContent>

            <div className="mt-20 space-y-20">
                <QuickGuide steps={toolGuides['/repair-pdf']} />
                <RelatedTools currentToolId="repairPdf" />
            </div>
        </div>
    );
}
