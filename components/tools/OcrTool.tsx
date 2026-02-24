/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Copy,
    Download,
    Zap,
    Cpu,
    Brain,
    Scan,
    RotateCw,
    X,
    Settings2,
    Eye,
    EyeOff,
    Hash,
    Table,
    MessageSquare,
    Workflow,
    FileText,
    Maximize2,
    ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { downloadFile } from '@/lib/utils';
import { OcrEngine, OcrOptions } from '@/lib/engines/ocr-engine';
import { NeuralChat } from '@/components/shared/NeuralChat';
import { KnowledgeGraph, knowledgeGraphEngine } from '@/lib/ai/knowledge-graph-engine';
import { ReflowViewer } from '@/components/shared/ReflowViewer';
import { OCRZone } from '@/lib/analysis/ocr-layout-analyzer';
import { ForensicResult } from '@/lib/engines/forensic-engine';
import { federatedEngine } from '@/lib/ai/federated-engine';
import { graphSmPcEngine } from '@/lib/ai/graph-smpc';

interface OcrResult {
    text: string;
    pdf?: Uint8Array;
    excel?: Uint8Array;
    csv?: string;
    classification?: {
        type: string;
        confidence: number;
        metadata: Record<string, string>;
    };
    knowledgeGraph?: KnowledgeGraph;
    pages: { zones: OCRZone[], pageNumber: number }[];
    forensicAudit?: ForensicResult[];
    confidenceMap?: { text: string, confidence: number }[];
}

interface OcrSettings {
    languages: string[];
    adaptiveThreshold: boolean;
    useAI: boolean;
    sanitizePII: boolean;
    forensicScrub: boolean;
    hyperCompression: boolean;
    extractKnowledgeGraph: boolean;
    forensicAudit: boolean;
}

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function OcrTool() {
    const tool = tools.find(t => t.id === 'ocrPdf')!;
    const [workerCount, setWorkerCount] = useState(2);

    useEffect(() => {
        if (typeof navigator !== 'undefined') {
            setWorkerCount(Math.min(4, navigator.hardwareConcurrency || 2));
        }
    }, []);

    const [initialFile, setInitialFile] = useState<File | null>(null);

    useEffect(() => {
        const savedScan = sessionStorage.getItem('last_scan_capture');
        if (savedScan) {
            fetch(savedScan)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "insta-scan-capture.png", { type: "image/png" });
                    setInitialFile(file);
                    sessionStorage.removeItem('last_scan_capture');
                    toast.success('Scan Ingested');
                });
        }
    }, []);

    const [originalExtraction, setOriginalExtraction] = useState('');

    const handleOCR = async (file: File, settings: OcrSettings): Promise<OcrResult> => {
        const engine = new OcrEngine();
        const res = await engine.recognize(file, {
            language: settings.languages[0] || 'eng',
            useAI: settings.useAI,
            sanitizePII: settings.sanitizePII,
            forensicScrub: settings.forensicScrub,
            hyperCompression: settings.hyperCompression,
            forensicAudit: settings.forensicAudit,
        });

        setOriginalExtraction(res.text);

        return {
            text: res.text,
            pdf: res.pdf,
            excel: res.excel,
            csv: res.csv,
            classification: res.classification,
            knowledgeGraph: res.knowledgeGraph,
            pages: res.pages,
            forensicAudit: res.forensicAudit,
            confidenceMap: res.confidenceMap
        };
    };

    const renderSettings = (settings: OcrSettings, setSettings: (s: OcrSettings) => void) => (
        <div className="space-y-6">
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Neural Languages</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'eng', label: 'English' },
                        { id: 'spa', label: 'Spanish' },
                        { id: 'fra', label: 'French' },
                        { id: 'deu', label: 'German' }
                    ].map((lang) => (
                        <button
                            key={lang.id}
                            onClick={() => setSettings({
                                ...settings,
                                languages: [lang.id] // Set single primary language for consensus pass
                            })}
                            className={`py-2 rounded-lg border text-[10px] uppercase font-black transition-all ${settings.languages.includes(lang.id)
                                ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-600/20'
                                : 'border-slate-800 text-slate-500 hover:border-slate-700'
                                }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                            <Brain className="w-3 h-3 text-teal-400" />
                            Neural Linguistic Correction
                        </p>
                        <p className="text-[9px] text-slate-500">Enable local AI to fix common OCR confusions</p>
                    </div>
                    <button
                        onClick={() => setSettings({ ...settings, useAI: !settings.useAI })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.useAI ? 'bg-teal-500' : 'bg-slate-800'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.useAI ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Blind OCR (Auto-Sanitize)
                        </p>
                        <p className="text-[9px] text-slate-500">Detect and redact PII (Emails, SSNs) automatically</p>
                    </div>
                    <button
                        onClick={() => setSettings({ ...settings, sanitizePII: !settings.sanitizePII })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.sanitizePII ? 'bg-emerald-500' : 'bg-slate-800'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.sanitizePII ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                            <EyeOff className="w-3 h-3 text-amber-400" />
                            Forensic Pixel Mask
                        </p>
                        <p className="text-[9px] text-slate-500">Irreversible pixel-level scrubbing of sensitive data</p>
                    </div>
                    <button
                        onClick={() => setSettings({ ...settings, forensicScrub: !settings.forensicScrub })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.forensicScrub ? 'bg-amber-500' : 'bg-slate-800'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.forensicScrub ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                            <Zap className="w-3 h-3 text-cyan-400" />
                            Hyper-Compression (MRC)
                        </p>
                        <p className="text-[9px] text-slate-500">Achieve 90% smaller files via MRC layering</p>
                    </div>
                    <button
                        onClick={() => setSettings({ ...settings, hyperCompression: !settings.hyperCompression })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.hyperCompression ? 'bg-cyan-500' : 'bg-slate-800'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.hyperCompression ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                            <Workflow className="w-3 h-3 text-indigo-400" />
                            Knowledge Graph (JSON-LD)
                        </p>
                        <p className="text-[9px] text-slate-500">Map semantic entities and relationships</p>
                    </div>
                    <button
                        onClick={() => setSettings({ ...settings, extractKnowledgeGraph: !settings.extractKnowledgeGraph })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.extractKnowledgeGraph ? 'bg-indigo-500' : 'bg-slate-800'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.extractKnowledgeGraph ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Forensic Integrity Audit
                        </p>
                        <p className="text-[9px] text-slate-500">Detect digital tampering and forgeries</p>
                    </div>
                    <button
                        onClick={() => setSettings({ ...settings, forensicAudit: !settings.forensicAudit })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.forensicAudit ? 'bg-emerald-500' : 'bg-slate-800'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.forensicAudit ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase flex items-center gap-1.5 ">
                        <Hash className="w-3 h-3 text-teal-400" />
                        Adaptive Scan
                    </span>
                </div>
                <button
                    onClick={() => setSettings({ ...settings, adaptiveThreshold: !settings.adaptiveThreshold })}
                    className={`w-8 h-4 rounded-full transition-colors relative ${settings.adaptiveThreshold ? 'bg-teal-600' : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${settings.adaptiveThreshold ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
            </div>

            <div className="flex items-center justify-between opacity-50">
                <span className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" />
                    {workerCount} Workers Active
                </span>
                <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
            </div>
        </div>
    );

    const [showChat, setShowChat] = useState(false);
    const [showReflow, setShowReflow] = useState(false);

    const renderSuccess = (result: OcrResult, file: File, reset: () => void) => (
        <div className="space-y-6">
            {showReflow && (
                <ReflowViewer
                    pages={result.pages}
                    fileName={file.name}
                    onClose={() => setShowReflow(false)}
                />
            )}
            {showChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                    <div className="w-full max-w-2xl bg-slate-900/90 rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <NeuralChat
                            documentText={result.text}
                            file={file}
                            onClose={() => setShowChat(false)}
                        />
                    </div>
                </div>
            )}
            <GlassCard className="p-8 border-emerald-500/20 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Extraction Crystalized</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{workerCount} Neural Threads Used</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-500/20"
                            onClick={() => setShowChat(true)}
                            icon={<MessageSquare className="w-4 h-4" />}
                        >
                            Neural Chat
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                            onClick={() => setShowReflow(true)}
                            icon={<Maximize2 className="w-4 h-4" />}
                        >
                            Reflow View
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(result.text);
                                toast.success('Copied to clipboard');
                            }}
                            icon={<Copy className="w-4 h-4" />}
                        >
                            Copy Text
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-500"
                            onClick={async () => {
                                const update = await federatedEngine.learnFromCorrection(originalExtraction, result.text);
                                if (update) {
                                    await federatedEngine.broadcast(update);
                                    toast.success('Neural Correction Contributed (Private)');
                                } else {
                                    toast.error('No significant correction detected');
                                }
                            }}
                            icon={<Brain className="w-4 h-4" />}
                        >
                            Commit Correction
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => downloadFile(new Blob([result.text], { type: 'text/plain' }), `${file.name}_extracted.txt`)}
                            icon={<Download className="w-4 h-4" />}
                        >
                            Save TXT
                        </Button>
                    </div>
                </div>

                {result.classification && (
                    <div className="mb-8 p-6 bg-teal-500/5 rounded-2xl border border-teal-500/10 flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-shrink-0 p-4 bg-teal-500/10 rounded-xl text-teal-400">
                            <Brain className="w-8 h-8" />
                        </div>
                        <div className="flex-grow space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Document Intent Detected</h4>
                                <div className="flex gap-2">
                                    {result.knowledgeGraph && (
                                        <span className="text-[10px] font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-full border border-fuchsia-500/20">
                                            {result.knowledgeGraph.entities.length} Entities
                                        </span>
                                    )}
                                    <span className="text-[10px] font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                                        {Math.round(result.classification.confidence * 100)}% Match
                                    </span>
                                </div>
                            </div>
                            <p className="text-xl font-bold text-teal-100">{result.classification.type}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                                {Object.entries(result.classification.metadata).map(([key, value]) => (
                                    <div key={key} className="p-2 bg-slate-900/50 rounded-lg border border-white/5">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">{key}</p>
                                        <p className="text-xs font-bold text-white truncate">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-slate-950/80 rounded-2xl p-6 h-[400px] overflow-y-auto font-mono text-xs leading-relaxed border border-slate-800 shadow-inner scrollbar-thin scrollbar-thumb-teal-900">
                    {result.confidenceMap && result.confidenceMap.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {result.confidenceMap.map((segment, idx) => {
                                const isLowConf = segment.confidence < 85;
                                return (
                                    <span
                                        key={idx}
                                        className={`px-0.5 rounded transition-all duration-300 ${isLowConf
                                            ? 'bg-amber-500/10 text-amber-200 border-b border-amber-500/30'
                                            : 'hover:text-teal-400 hover:bg-teal-500/5'
                                            }`}
                                        title={isLowConf ? `Confidence: ${Math.round(segment.confidence)}%` : undefined}
                                    >
                                        {segment.text}
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap text-teal-100/90 leading-relaxed font-sans text-sm tracking-tight">
                            {result.text}
                        </div>
                    )}
                </div>

                {(result.pdf || result.excel || result.csv) ? (
                    <div className="mt-8 pt-8 border-t border-slate-800 space-y-4">
                        {result.pdf && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold">Searchable PDF Ready</h4>
                                        <p className="text-xs text-slate-500">Visual Reconstruction & Metadata Injected</p>
                                    </div>
                                </div>
                                <Button
                                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all duration-300"
                                    onClick={() => {
                                        if (result.pdf) {
                                            downloadFile(new Blob([result.pdf as any], { type: 'application/pdf' }), `${file.name}_searchable.pdf`);
                                        }
                                    }}
                                    icon={<Zap className="w-4 h-4" />}
                                >
                                    Download God Mode PDF
                                </Button>
                            </div>
                        )}

                        {result.excel && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                                        <Table className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold">Structured Data Detected</h4>
                                        <p className="text-xs text-slate-500">Tables extracted to Excel & CSV</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="secondary"
                                        className="flex-1 sm:flex-initial"
                                        onClick={() => {
                                            if (result.excel) {
                                                downloadFile(new Blob([result.excel as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${file.name}_data.xlsx`);
                                            }
                                        }}
                                        icon={<Download className="w-4 h-4" />}
                                    >
                                        Excel
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="flex-1 sm:flex-initial"
                                        onClick={() => {
                                            if (result.csv) {
                                                downloadFile(new Blob([result.csv], { type: 'text/csv' }), `${file.name}_data.csv`);
                                            }
                                        }}
                                        icon={<Download className="w-4 h-4" />}
                                    >
                                        CSV
                                    </Button>
                                </div>
                            </div>
                        )}

                        {result.knowledgeGraph && result.knowledgeGraph.entities.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 mt-6 border-t border-slate-800/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-fuchsia-500/10 rounded-xl text-fuchsia-400">
                                        <Workflow className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold">Semantic Graph Mapped</h4>
                                        <p className="text-xs text-slate-500">{result.knowledgeGraph.entities.length} Entities & {result.knowledgeGraph.relationships.length} Relationships</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="border-indigo-500/30 hover:bg-indigo-500/10"
                                        onClick={async () => {
                                            if (result.knowledgeGraph) {
                                                const blinded = await graphSmPcEngine.blindGraph(result.knowledgeGraph);
                                                toast.success('Graph Blinded & Synced to Swarm');
                                                console.log('[SMPC] Blinded Graph for P2P Sync:', blinded);
                                            }
                                        }}
                                        icon={<Workflow className="w-4 h-4" />}
                                    >
                                        Swarm Sync
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="w-full sm:w-auto border-fuchsia-500/30 hover:bg-fuchsia-500/10"
                                        onClick={() => {
                                            const jsonld = knowledgeGraphEngine.convertToJSONLD(result.knowledgeGraph!);
                                            downloadFile(new Blob([JSON.stringify(jsonld, null, 2)], { type: 'application/ld+json' }), `${file.name}_knowledge.jsonld`);
                                        }}
                                        icon={<Download className="w-4 h-4" />}
                                    >
                                        Export JSON-LD
                                    </Button>
                                </div>
                            </div>
                        )}

                        {result.forensicAudit && result.forensicAudit.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 mt-6 border-t border-slate-800/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold">Integrity Verified</h4>
                                        <p className="text-xs text-slate-500">Document Integrity Score: {Math.round(result.forensicAudit[0].integrityScore * 100)}%</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="border-blue-500/30 hover:bg-blue-500/10"
                                        onClick={() => {
                                            const url = URL.createObjectURL(result.forensicAudit![0].elaImage!);
                                            window.open(url, '_blank');
                                        }}
                                    >
                                        ELA Map
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="border-indigo-500/30 hover:bg-indigo-500/10"
                                        onClick={() => {
                                            const url = URL.createObjectURL(result.forensicAudit![0].noiseMap!);
                                            window.open(url, '_blank');
                                        }}
                                    >
                                        Noise Profile
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                        <Button
                            variant="primary"
                            onClick={() => {
                                setShowChat(false);
                                setShowReflow(false);
                                reset();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500"
                        >
                            Process Another Document
                        </Button>
                    </div>
                )}
            </GlassCard>

            <Button variant="ghost" onClick={() => {
                setShowChat(false);
                setShowReflow(false);
                reset();
            }} className="w-full text-slate-600 hover:text-slate-400 uppercase text-[10px] font-black tracking-widest">
                Discard Results & Initialize New Scan
            </Button>
        </div>
    );

    return (
        <TransformerShell<OcrSettings, OcrResult>
            tool={tool}
            engine={handleOCR}
            initialFile={initialFile}
            initialSettings={{
                languages: ['eng'],
                adaptiveThreshold: true,
                useAI: true,
                sanitizePII: false,
                forensicScrub: false,
                hyperCompression: false,
                extractKnowledgeGraph: true,
                forensicAudit: false
            }}
            renderSettings={renderSettings}
            renderSuccess={renderSuccess}
            accept={{
                'application/pdf': ['.pdf'],
                'image/*': ['.png', '.jpg', '.jpeg', '.bmp']
            }}
        />
    );
}

