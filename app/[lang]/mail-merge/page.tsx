
'use client';

import { MailMergeTool } from '@/components/tools/MailMergeTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { Mail } from 'lucide-react';

export default function MailMergePage() {
    return (
        <div className="container mx-auto py-12 px-4 selection:bg-cyan-500/30">
            <ToolHeader
                title="Mail Merge"
                description="Generate hundreds of PDFs from a CSV and a Template."
                icon={Mail}
                toolId="mail-merge"
                color="from-green-500 to-emerald-600"
            />
            <MailMergeTool />
        </div>
    );
}
