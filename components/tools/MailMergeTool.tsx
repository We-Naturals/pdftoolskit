/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { FileUpload } from '@/components/shared/FileUpload';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { FileSpreadsheet, FileText, Variable } from 'lucide-react';
import toast from 'react-hot-toast';
import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function MailMergeTool() {
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stats, setStats] = useState<{ count: number, headers: string[] } | null>(null);
    const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) return { headers: [], data: [] };
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const row: Record<string, string> = {};
            headers.forEach((h, i) => row[h] = (values[i] || '').trim());
            return row;
        });
        return { headers, data };
    };

    const handleCsvUpload = async (files: File[]) => {
        const file = files[0];
        setCsvFile(file);
        const text = await file.text();
        const { headers, data } = parseCSV(text);
        setStats({ count: data.length, headers });
        setParsedData(data);
        toast.success(`Loaded ${data.length} rows with headers: ${headers.join(', ')}`);
    };

    const processMerge = async () => {
        if (!templateFile || parsedData.length === 0) return;
        setIsProcessing(true);
        const toastId = toast.loading('Generating PDFs...');

        try {
            const templateData = await templateFile.arrayBuffer();
            const result = await globalWorkerPool.runTask<Uint8Array>('MAIL_MERGE', {
                templateData,
                rows: parsedData
            });

            const blob = new Blob([result as any], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `merged_documents.zip`;
            a.click();

            toast.success('Batch generation complete!', { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error('Failed to merge', { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-cyan-500">
                    Mail Merge
                </h1>
                <p className="text-slate-400 text-lg">
                    Generate hundreds of PDFs from a CSV and a Template.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Step 1: Template */}
                <GlassCard className="p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-red-500/20 rounded-lg text-red-400">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">1. Upload Template PDF</h3>
                            <p className="text-sm text-slate-400">Must contain Form Fields matching CSV headers.</p>
                        </div>
                    </div>
                    {!templateFile ? (
                        <FileUpload
                            onFilesSelected={(f) => setTemplateFile(f[0])}
                            accept={{ 'application/pdf': ['.pdf'] }}
                            maxSize={10 * 1024 * 1024}
                        />
                    ) : (
                        <div className="p-4 bg-slate-800/50 rounded border border-white/10 flex justify-between items-center text-sm">
                            <span>{templateFile.name}</span>
                            <button onClick={() => setTemplateFile(null)} className="text-red-400 hover:text-red-300">Remove</button>
                        </div>
                    )}
                </GlassCard>

                {/* Step 2: CSV */}
                <GlassCard className="p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-green-500/20 rounded-lg text-green-400">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">2. Upload Data (CSV)</h3>
                            <p className="text-sm text-slate-400">Columns must match PDF field names.</p>
                        </div>
                    </div>
                    {!csvFile ? (
                        <FileUpload
                            onFilesSelected={handleCsvUpload}
                            accept={{ 'text/csv': ['.csv'] }}
                            maxSize={5 * 1024 * 1024}
                        />
                    ) : (
                        <div className="space-y-2">
                            <div className="p-4 bg-slate-800/50 rounded border border-white/10 flex justify-between items-center text-sm">
                                <span>{csvFile.name}</span>
                                <button onClick={() => { setCsvFile(null); setStats(null); }} className="text-red-400 hover:text-red-300">Remove</button>
                            </div>
                            {stats && (
                                <div className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                                    <p>Found {stats.count} rows.</p>
                                    <p>Headers: <span className="text-cyan-400">{stats.headers.join(', ')}</span></p>
                                </div>
                            )}
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Step 3: Action */}
            <div className="flex justify-center pt-8">
                <Button
                    size="lg"
                    onClick={processMerge}
                    disabled={!templateFile || !csvFile || isProcessing}
                    className="bg-gradient-to-r from-green-500 to-cyan-600 hover:from-green-400 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20 px-12 py-6 text-xl"
                >
                    {isProcessing ? 'Generating...' : (
                        <>
                            <Variable className="w-6 h-6 mr-3" />
                            Generate {stats ? stats.count : ''} Documents
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
