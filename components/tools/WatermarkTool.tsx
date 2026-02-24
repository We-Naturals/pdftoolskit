/* eslint-disable */
'use client';

import React from 'react';
import { Type, Droplet, MoveVertical, Palette, RotateCw, Sparkles } from 'lucide-react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { tools } from '@/data/tools';
import { addWatermark } from '@/lib/pdf-utils';
import { PDFPageViewer } from '@/components/pdf/PDFPageViewer';
import { InteractiveOverlay, SelectionRect } from '@/components/pdf/InteractiveOverlay';
import { cn } from '@/lib/utils';

interface WatermarkSettings {
    text: string;
    opacity: number;
    size: number;
    color: string;
    rotation: number;
    layoutMode: 'single' | 'mosaic';
    selection: SelectionRect;
    pageDims: { width: number; height: number };
}

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function WatermarkTool() {
    const tool = tools.find(t => t.id === 'addWatermark')!;

    const handleApply = async (file: File, settings: WatermarkSettings) => {
        const refW = settings.pageDims.width || 100;
        const refH = settings.pageDims.height || 100;

        const uiCenterX = settings.selection.x + (settings.selection.width / 2);
        const uiCenterY = settings.selection.y + (settings.selection.height / 2);

        const relX = uiCenterX / refW;
        const relY = uiCenterY / refH;

        const r = parseInt(settings.color.slice(1, 3), 16) / 255;
        const g = parseInt(settings.color.slice(3, 5), 16) / 255;
        const b = parseInt(settings.color.slice(5, 7), 16) / 255;

        const fileData = await file.arrayBuffer();
        const result = await globalWorkerPool.runTask<Uint8Array>('ADD_WATERMARK', {
            fileData,
            text: settings.text,
            options: {
                opacity: settings.opacity,
                size: settings.size,
                color: { r, g, b },
                rotation: settings.rotation,
                layout: settings.layoutMode,
                x: relX,
                y: relY
            }
        });

        return new Blob([result as any], { type: 'application/pdf' });
    };

    const renderPreview = (settings: WatermarkSettings, setSettings: (s: WatermarkSettings) => void, file: File) => (
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5 min-h-[500px] flex items-center justify-center w-full group">
            <PDFPageViewer
                file={file}
                pageNumber={1}
                scale={1.0}
                onPageLoad={(w, h) => {
                    if (settings.pageDims.width === 0) {
                        setSettings({
                            ...settings,
                            pageDims: { width: w, height: h },
                            selection: {
                                x: Math.round(w * 0.2),
                                y: Math.round(h * 0.4),
                                width: Math.round(w * 0.6),
                                height: 120
                            }
                        });
                    }
                }}
            />
            {settings.pageDims.width > 0 && (
                <div
                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                >
                    <div className="relative" style={{ width: settings.pageDims.width, height: settings.pageDims.height }}>
                        {settings.layoutMode === 'single' ? (
                            <div className="pointer-events-auto w-full h-full">
                                <InteractiveOverlay
                                    width={settings.pageDims.width}
                                    height={settings.pageDims.height}
                                    selection={settings.selection}
                                    onSelectionChange={(sel) => setSettings({ ...settings, selection: sel })}
                                    label=""
                                    color={settings.color}
                                >
                                    <div className="w-full h-full flex items-center justify-center overflow-hidden"
                                        style={{
                                            transform: `rotate(${settings.rotation}deg)`,
                                            opacity: settings.opacity
                                        }}>
                                        <span
                                            style={{
                                                fontSize: `${settings.size}px`,
                                                color: settings.color,
                                                fontWeight: 'bold',
                                                whiteSpace: 'nowrap',
                                                fontFamily: 'Inter, sans-serif'
                                            }}
                                        >
                                            {settings.text}
                                        </span>
                                    </div>
                                </InteractiveOverlay>
                            </div>
                        ) : (
                            <div className="w-full h-full p-4 overflow-hidden relative opacity-60">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute flex items-center justify-center"
                                        style={{
                                            left: `${(i % 4) * 25}%`,
                                            top: `${Math.floor(i / 4) * 25}%`,
                                            width: '25%',
                                            height: '25%',
                                            transform: `rotate(${settings.rotation}deg)`,
                                            opacity: settings.opacity
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: `${settings.size / 2}px`,
                                                color: settings.color,
                                                fontWeight: 'bold',
                                                whiteSpace: 'nowrap',
                                                fontFamily: 'Inter, sans-serif'
                                            }}
                                        >
                                            {settings.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Interactive Canvas</span>
            </div>
        </div>
    );

    const renderSettings = (settings: WatermarkSettings, setSettings: (s: WatermarkSettings) => void) => (
        <div className="space-y-6">
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                    <Type className="w-3 h-3 text-indigo-400" /> Watermark Text
                </label>
                <input
                    type="text"
                    value={settings.text}
                    onChange={(e) => setSettings({ ...settings, text: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all shadow-inner font-bold"
                />
            </div>

            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                <button
                    onClick={() => setSettings({ ...settings, layoutMode: 'single' })}
                    className={cn(
                        "flex-1 py-2 text-[10px] uppercase font-black rounded-lg transition-all",
                        settings.layoutMode === 'single' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-white"
                    )}
                >
                    Single
                </button>
                <button
                    onClick={() => setSettings({ ...settings, layoutMode: 'mosaic' })}
                    className={cn(
                        "flex-1 py-2 text-[10px] uppercase font-black rounded-lg transition-all",
                        settings.layoutMode === 'mosaic' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-white"
                    )}
                >
                    Mosaic
                </button>
            </div>

            <div className="space-y-5 pt-4 border-t border-white/5">
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                        <span className="flex items-center gap-1.5"><MoveVertical className="w-3 h-3" /> Size: {settings.size}px</span>
                    </div>
                    <input
                        type="range"
                        min="12" max="200"
                        value={settings.size}
                        onChange={(e) => setSettings({ ...settings, size: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                        <span className="flex items-center gap-1.5"><Droplet className="w-3 h-3" /> Opacity: {Math.round(settings.opacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0.1" max="1" step="0.1"
                        value={settings.opacity}
                        onChange={(e) => setSettings({ ...settings, opacity: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                            <RotateCw className="w-3 h-3" /> Rotation: {settings.rotation}°
                        </div>
                        <input
                            type="range"
                            min="-180" max="180" step="15"
                            value={settings.rotation}
                            onChange={(e) => setSettings({ ...settings, rotation: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 tracking-tighter mb-1">
                            <Palette className="w-3 h-3" /> Color
                        </div>
                        <input
                            type="color"
                            value={settings.color}
                            onChange={(e) => setSettings({ ...settings, color: e.target.value })}
                            className="w-full h-10 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer overflow-hidden p-0 border-none shadow-lg"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <TransformerShell<WatermarkSettings>
            tool={tool}
            engine={handleApply}
            initialSettings={{
                text: 'CONFIDENTIAL',
                opacity: 0.3,
                size: 80,
                color: '#6366f1',
                rotation: -45,
                layoutMode: 'single',
                selection: { x: 100, y: 300, width: 400, height: 120 },
                pageDims: { width: 0, height: 0 }
            }}
            renderPreview={renderPreview}
            renderSettings={renderSettings}
            successMessage="Document Watermarked Seamlessly"
        />
    );
}
