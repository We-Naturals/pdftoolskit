/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { FileText, Copy, Download, Languages, BrainCircuit } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { FileUpload } from '@/components/shared/FileUpload';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { downloadFile, getBaseFileName } from '@/lib/utils';
import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function MagicOCRTool() {
    const { t: _t } = useTranslation('common');
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('Initializing...');
    const [extractedText, setExtractedText] = useState('');
    const [language, setLanguage] = useState('eng');

    const handleFileSelected = (files: File[]) => {
        if (files[0]) {
            setFile(files[0]);
            setExtractedText('');
            toast.success('Image loaded for OCR');
        }
    };

    const handleOCR = async () => {
        if (!file) return;
        setProcessing(true);
        setProgress(10);
        setStatusText('Volume analysis...');

        try {
            const fileData = await file.arrayBuffer();
            const { text } = await globalWorkerPool.runTask<{ text: string }>('OCR_PDF', {
                fileData,
                options: { languages: [language], adaptiveThreshold: true }
            });

            setExtractedText(text);
            setStatusText('Complete');
            setProgress(100);
            toast.success('Text extracted successfully!');
        } catch (error) {
            console.error(error);
            toast.error('OCR Failed');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(extractedText);
        toast.success('Copied to clipboard');
    };

    const downloadText = () => {
        const blob = new Blob([extractedText], { type: 'text/plain' });
        downloadFile(blob, `${getBaseFileName(file?.name || 'ocr')}.txt`);
    };

    return (
        <div className="w-full space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="space-y-6">
                    <FileUpload
                        onFilesSelected={handleFileSelected}
                        files={file ? [file] : []}
                        onRemoveFile={() => { setFile(null); setExtractedText(''); }}
                        multiple={false}
                        accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'], 'application/pdf': ['.pdf'] }}
                        maxSize={10 * 1024 * 1024}
                    />

                    {file && !processing && (
                        <div className="animate-in slide-up fade-in duration-500">
                            <GlassCard className="p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-indigo-500/20 rounded-xl">
                                        <Languages className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Detection Language</label>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="eng">English</option>
                                            <option value="deu">German</option>
                                            <option value="fra">French</option>
                                            <option value="spa">Spanish</option>
                                            <option value="ita">Italian</option>
                                            <option value="por">Portuguese</option>
                                        </select>
                                    </div>
                                </div>

                                <Button
                                    variant="primary"
                                    onClick={handleOCR}
                                    className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/20"
                                    icon={<BrainCircuit className="w-5 h-5" />}
                                >
                                    Start Magic OCR
                                </Button>
                            </GlassCard>
                        </div>
                    )}

                    {processing && (
                        <div className="animate-in fade-in duration-300">
                            <ProgressBar progress={progress} label={statusText} />
                        </div>
                    )}
                </div>

                {/* Output Section */}
                <div className="h-full min-h-[500px]">
                    <GlassCard className="h-full flex flex-col p-0 overflow-hidden border-indigo-500/20">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                Extracted Content
                            </h3>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={copyToClipboard} disabled={!extractedText}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={downloadText} disabled={!extractedText}>
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 p-6 bg-slate-900/50">
                            {extractedText ? (
                                <textarea
                                    value={extractedText}
                                    onChange={(e) => setExtractedText(e.target.value)}
                                    className="w-full h-full bg-transparent border-none resize-none text-slate-300 focus:outline-none font-mono text-sm leading-relaxed"
                                    placeholder="Text will appear here..."
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                                    <BrainCircuit className="w-16 h-16 mb-4" />
                                    <p>Ready to extract intelligence</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

