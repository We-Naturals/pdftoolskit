
'use client';

import React, { useState } from 'react';
import { Download, CheckCircle, FileText, Sparkles, AlertCircle, RefreshCcw } from 'lucide-react';
import { FileUpload } from '@/components/shared/FileUpload';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { downloadFile } from '@/lib/utils';
import { useJobStore } from '@/lib/stores/job-store';
import { jobQueue } from '@/lib/services/job-queue';
import { useSubscription } from '@/components/providers/SubscriptionProvider';
import toast from 'react-hot-toast';
import { ConfigPanels } from './ConfigPanels';
import { ConversionPreviewer } from './ConversionPreviewer';

interface UniversalConverterProps {
    toolName: string;
    action: string;
    acceptedTypes: string[];
    description: string;
    type: 'client' | 'server';
}

export function UniversalConverter({
    toolName,
    action,
    acceptedTypes: _acceptedTypes,
    description,
    type
}: UniversalConverterProps) {
    const { limits, isPro } = useSubscription();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [config, setConfig] = useState<Record<string, any>>({});

    // Watch the job store for the active job
    // eslint-disable-next-line security/detect-object-injection
    const job = useJobStore((state) => activeJobId ? state.jobs[activeJobId] : null);

    const handleFilesSelected = (files: File[]) => {
        setSelectedFiles(files);
    };

    const handleConvert = async () => {
        if (selectedFiles.length === 0) return;

        try {
            // Track the original file for preview
            // const currentFile = selectedFiles[0];

            const id = await jobQueue.enqueue(
                selectedFiles,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [{ id: 'step-1', action: action as any, params: config }],
                toolName,
                { type }
            );
            setActiveJobId(id);
        } catch (_error) {
            toast.error('Failed to start conversion');
        }
    };

    const handleReset = () => {
        setSelectedFiles([]);
        setActiveJobId(null);
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. Reset / Success View */}
            {job?.status === 'completed' && (
                <GlassCard className="p-12 text-center border-green-500/20 shadow-2xl">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20">
                        <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">Conversion Successful!</h3>
                    <p className="text-slate-400 mb-8">Your document has been transformed by the Alchemist.</p>

                    {selectedFiles.length > 0 && job.result && (
                        <div className="mb-10 text-left">
                            <ConversionPreviewer
                                originalFile={selectedFiles[0]}
                                resultFile={new File([job.result], `converted_${job.fileName}`)}
                            />
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => job.result && downloadFile(job.result, `converted_${job.fileName}`)}
                            icon={<Download className="w-5 h-5" />}
                            className="bg-green-600 hover:bg-green-500 py-6 px-8 text-xl"
                        >
                            Download Result
                        </Button>
                        <Button variant="ghost" onClick={handleReset} className="text-slate-500">
                            Start New Task
                        </Button>
                    </div>
                </GlassCard>
            )}

            {/* 2. Processing View */}
            {job && job.status !== 'completed' && job.status !== 'failed' && (
                <div className="space-y-8 py-10">
                    <div className="text-center space-y-4">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-purple-500/10 rounded-full" />
                            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-purple-400 animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-bold text-white italic">
                            {job.status === 'pending' ? 'Preparing Alchemy...' : 'Transmuting Bytes...'}
                        </h3>
                        {job.error && <p className="text-purple-400 text-sm animate-pulse">{job.error}</p>}
                    </div>

                    <ProgressBar progress={job.progress} label={job.status === 'processing' ? `Processing ${job.fileName}` : 'Initializing...'} />
                </div>
            )}

            {/* 3. Error View */}
            {job?.status === 'failed' && (
                <GlassCard className="p-12 text-center border-red-500/20 shadow-2xl">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">Alchemy Failed</h3>
                    <p className="text-red-400/70 mb-10">{job.error || 'An unexpected error occurred during conversion.'}</p>
                    <Button variant="primary" onClick={handleReset} icon={<RefreshCcw className="w-4 h-4" />}>
                        Retry Conversion
                    </Button>
                </GlassCard>
            )}

            {/* 4. Upload & Config View */}
            {!activeJobId && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <GlassCard className="p-8 border-white/5 bg-slate-900/50">
                            <FileUpload
                                onFilesSelected={handleFilesSelected}
                                files={selectedFiles}
                                onRemoveFile={(idx) => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                multiple={true}
                                maxSize={limits.maxFileSize}
                                isPro={isPro}
                            // acceptedTypes={acceptedTypes as any}
                            />
                        </GlassCard>

                        <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl flex items-start gap-4">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <FileText className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-white">{toolName}</h5>
                                <p className="text-xs text-slate-400">{description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <GlassCard className="p-6 h-full flex flex-col">
                            <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                Alchemy Settings
                            </h4>

                            <div className="flex-grow">
                                <ConfigPanels
                                    action={action}
                                    onChange={setConfig}
                                />
                            </div>

                            <Button
                                variant="primary"
                                onClick={handleConvert}
                                disabled={selectedFiles.length === 0}
                                size="lg"
                                className="w-full py-6 mt-8 bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-600/20"
                            >
                                Start Conversion
                            </Button>
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
}
