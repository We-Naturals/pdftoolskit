
'use client';

import { BioWriterTool } from '@/components/tools/BioWriterTool';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { Dna } from 'lucide-react';

export default function BioEncodePage() {
    return (
        <div className="container mx-auto py-12 px-4 selection:bg-emerald-500/30">
            <ToolHeader
                title="Bio-Encode"
                description="Archive your PDF into synthetic DNA strands for deep storage."
                icon={Dna}
                toolId="bio-encode"
                color="from-emerald-500 to-teal-600"
            />
            <BioWriterTool />
        </div>
    );
}
