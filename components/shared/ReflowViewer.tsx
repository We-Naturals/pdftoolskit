
'use client';

import React, { useState, useMemo } from 'react';
import {
    X,
    Settings,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { reflowEngine } from '@/lib/engines/reflow-engine';
import { OCRZone } from '@/lib/analysis/ocr-layout-analyzer';

interface ReflowViewerProps {
    pages: { zones: OCRZone[], pageNumber: number }[];
    onClose?: () => void;
    fileName?: string;
}

export function ReflowViewer({ pages, onClose, fileName }: ReflowViewerProps) {
    const [fontSize, setFontSize] = useState(16);
    const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('dark');

    const tree = useMemo(() => reflowEngine.virtualize(pages), [pages]);

    const themes = {
        light: 'bg-white text-slate-900',
        dark: 'bg-slate-950 text-slate-200',
        sepia: 'bg-[#f4ecd8] text-[#5b4636]'
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            {/* Control Bar */}
            <div className="h-16 border-b border-white/5 bg-white/5 flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-none">Semantic Reflow View</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">
                            {fileName || 'Document'} • {pages.length} Pages
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Settings Dropdown/Popover shorthand */}
                    <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                            className="h-8 w-8 p-0"
                        >
                            A-
                        </Button>
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                            className="h-8 w-8 p-0"
                        >
                            A+
                        </Button>
                    </div>

                    <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme('light')}
                            className={`h-8 w-8 p-0 rounded-lg ${theme === 'light' ? 'bg-white text-black' : ''}`}
                        >
                            L
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme('dark')}
                            className={`h-8 w-8 p-0 rounded-lg ${theme === 'dark' ? 'bg-indigo-600 text-white' : ''}`}
                        >
                            D
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme('sepia')}
                            className={`h-8 w-8 p-0 rounded-lg ${theme === 'sepia' ? 'bg-[#5b4636] text-[#f4ecd8]' : ''}`}
                        >
                            S
                        </Button>
                    </div>

                    <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            {/* eslint-disable-next-line security/detect-object-injection */}
            <div className={`flex-grow overflow-y-auto overflow-x-hidden ${themes[theme]} transition-colors duration-500`}>
                <div
                    className="max-w-3xl mx-auto py-20 px-6 sm:px-12 md:px-20 animate-in slide-in-from-bottom-10 duration-700"
                    style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.6
                    }}
                >
                    {tree.sections.map((node, idx) => {
                        // eslint-disable-next-line security/detect-object-injection
                        const Tag = node.type as React.ElementType;

                        // Handle Tables
                        if (node.type === 'table') {
                            const rows = node.content as string[][];
                            return (
                                <div key={idx} className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-4">
                                    <table className="w-full text-left border-collapse min-w-[400px]">
                                        <tbody>
                                            {rows.map((row, ridx) => (
                                                <tr key={ridx} className="border-b border-white/5 last:border-0">
                                                    {row.map((cell, cidx) => (
                                                        <td key={cidx} className="p-2 text-[0.85em]">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        }

                        // Handle Regular Nodes
                        return (
                            <Tag
                                key={idx}
                                className={`
                                    ${node.type === 'h2' ? 'text-3xl font-black mt-12 mb-6 tracking-tight border-b-2 border-indigo-500/20 pb-2' : ''}
                                    ${node.type === 'p' ? 'mb-4 leading-relaxed' : ''}
                                    ${node.metadata?.isFooter ? 'text-[0.65em] opacity-50 mt-8 italic' : ''}
                                `}
                            >
                                {node.content}
                            </Tag>
                        );
                    })}

                    <div className="h-40" />
                </div>
            </div>

            {/* Bottom Info / Status */}
            <div className="h-10 border-t border-white/5 bg-slate-950 flex items-center justify-center px-6">
                <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest flex items-center gap-2">
                    <Settings className="w-3 h-3" />
                    Optimized by OMNIOS Semantic Reflow Engine v1.0
                </span>
            </div>
        </div>
    );
}
