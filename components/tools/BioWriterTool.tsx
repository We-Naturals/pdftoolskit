/* eslint-disable */

'use client';

import React, { useState } from 'react';
import { BioEncoder } from '@/lib/codecs/BioEncoder';
import { FileUpload } from '@/components/shared/FileUpload';
import { GlassCard } from '@/components/ui/GlassCard';
// import { Dna } from 'lucide-react';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function BioWriterTool() {
    const [dna, setDna] = useState('');

    const handleUpload = async (files: File[]) => {
        const fileData = await files[0].arrayBuffer();
        const seq = await globalWorkerPool.runTask<string>('BIO_ENCODE', { fileData });
        // Truncate for display if too long
        setDna(seq.slice(0, 1000) + (seq.length > 1000 ? '...' : ''));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                    Bio-Encode (DNA Storage)
                </h1>
                <p className="text-slate-400">Archive your PDF into synthetic DNA strands for 10,000 year storage.</p>
            </div>

            <GlassCard className="p-6">
                <FileUpload onFilesSelected={handleUpload} maxSize={1024 * 1024} />
            </GlassCard>

            {dna && (
                <GlassCard className="p-6 break-all font-mono text-xs leading-relaxed text-emerald-400 bg-black border-emerald-900 overflow-y-auto max-h-96">
                    {dna}
                </GlassCard>
            )}
        </div>
    );
}

