/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { Hammer, FileText } from 'lucide-react'; // Removed 'Download' as it was unused
import toast from 'react-hot-toast';
import { FileUpload } from '@/components/shared/FileUpload';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { downloadFile, getBaseFileName, validatePDFFile } from '@/lib/utils';
import { BatesOptions } from '@/lib/services/pdf/batesService'; // Kept BatesOptions for type safety, BatesService is dynamically imported
// import { ProgressBar } from '@/components/shared/ProgressBar';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function BatesStampTool() {
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [options, setOptions] = useState<BatesOptions>({
        prefix: 'CONFIDENTIAL-',
        startNumber: 1,
        digits: 6,
        position: 'BR'
    });

    const handleFileSelected = (files: File[]) => {
        const validation = validatePDFFile(files[0]);
        if (validation.valid) {
            setFile(files[0]);
            toast.success('PDF ready for stamping');
        } else {
            toast.error(validation.error || 'Invalid file');
        }
    };

    const handleStamp = async () => {
        if (!file) return;
        setProcessing(true);
        const toastId = toast.loading('Applying Bates Stamp...');

        try {
            const fileData = await file.arrayBuffer();
            const result = await globalWorkerPool.runTask<Uint8Array>('BATES_STAMP', {
                fileData,
                options
            });

            const baseName = getBaseFileName(file.name);
            const fileName = `${baseName}_bates.pdf`;

            downloadFile(new Blob([result as any], { type: 'application/pdf' }), fileName);

            toast.success('Bates Stamp Applied!', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Failed to stamp PDF', { id: toastId });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="w-full space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <FileUpload
                        onFilesSelected={handleFileSelected}
                        files={file ? [file] : []}
                        onRemoveFile={() => setFile(null)}
                        multiple={false}
                        maxSize={20 * 1024 * 1024}
                    />

                    {file && (
                        <GlassCard className="p-6 space-y-6 animate-in slide-up fade-in duration-500">
                            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                                <Hammer className="w-5 h-5 text-indigo-400" />
                                <h3 className="font-bold text-white">Stamping Configuration</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Prefix</label>
                                    <input
                                        type="text"
                                        value={options.prefix}
                                        onChange={e => setOptions({ ...options, prefix: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                        placeholder="e.g. CASE-"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Start Number</label>
                                    <input
                                        type="number"
                                        value={options.startNumber}
                                        onChange={e => setOptions({ ...options, startNumber: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Digits Padding</label>
                                    <input
                                        type="number"
                                        value={options.digits}
                                        onChange={e => setOptions({ ...options, digits: parseInt(e.target.value) || 3 })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                        min={1} max={10}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Position</label>
                                    <select
                                        value={options.position}
                                        onChange={e => setOptions({ ...options, position: e.target.value as BatesOptions['position'] })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                    >
                                        <option value="TL">Top Left</option>
                                        <option value="TR">Top Right</option>
                                        <option value="BL">Bottom Left</option>
                                        <option value="BR">Bottom Right</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-900/50 rounded-lg flex items-center justify-center border border-dashed border-slate-700">
                                <span className="text-slate-500 text-sm mr-2">Preview:</span>
                                <span className="text-indigo-400 font-mono font-bold text-lg">
                                    {options.prefix}{options.startNumber.toString().padStart(options.digits, '0')}
                                </span>
                            </div>

                            <Button
                                variant="primary"
                                onClick={handleStamp}
                                disabled={processing}
                                loading={processing}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500"
                                icon={<Hammer className="w-4 h-4" />}
                            >
                                Apply Bates Stamp
                            </Button>
                        </GlassCard>
                    )}
                </div>

                {/* Info Panel */}
                <div className="space-y-6">
                    <GlassCard className="h-full p-6 flex flex-col justify-center items-center text-center">
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Discovery Engine</h3>
                        <p className="text-slate-400 text-sm max-w-xs">
                            Legal-grade document processing. Automatically number pages sequentially across volume sets.
                        </p>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

