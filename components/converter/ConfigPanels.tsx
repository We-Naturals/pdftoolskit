
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import Slider from '../ui/Slider';
import { Switch } from '../ui/Switch';

interface ConfigPanelsProps {
    action: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (config: Record<string, any>) => void;
}

export function ConfigPanels({ action, onChange }: ConfigPanelsProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [config, setConfig] = useState<Record<string, any>>({});

    useEffect(() => {
        // Initialize default config based on action
        let defaults = {};
        if (action.includes('pdfToImage')) {
            defaults = { quality: 80, dpi: 150, format: 'jpg' };
        } else if (action === 'pdfToWord') {
            defaults = { layout: 'preserve', tables: true, images: true };
        } else if (action === 'ocr') {
            defaults = { language: 'eng', engine: 'tesseract', deskew: true };
        } else if (action === 'pdfToExcel') {
            defaults = { format: 'xlsx', multipleSheets: false };
        }

        setConfig(defaults);
        onChange(defaults);
    }, [action, onChange]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateConfig = (key: string, value: any) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        onChange(newConfig);
    };

    if (action.includes('pdfToImage')) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase font-black">Output Format</Label>
                    <Select value={config.format} onValueChange={(v: string) => updateConfig('format', v)}>
                        <SelectTrigger className="bg-slate-900 border-white/5">
                            <SelectValue placeholder="Select Format" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="jpg">JPEG (High Comp)</SelectItem>
                            <SelectItem value="png">PNG (Lossless)</SelectItem>
                            <SelectItem value="webp">WebP (Optimized)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between">
                        <Label className="text-xs text-slate-500 uppercase font-black">Quality</Label>
                        <span className="text-xs text-purple-400 font-bold">{config.quality}%</span>
                    </div>
                    <Slider
                        value={config.quality}
                        onChange={(v: number) => updateConfig('quality', v)}
                        min={10}
                        max={100}
                        step={1}
                        className="py-4"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase font-black">DPI Resolution</Label>
                    <Select value={String(config.dpi)} onValueChange={(v: string) => updateConfig('dpi', Number(v))}>
                        <SelectTrigger className="bg-slate-900 border-white/5">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="72">72 DPI (Web)</SelectItem>
                            <SelectItem value="150">150 DPI (Balanced)</SelectItem>
                            <SelectItem value="300">300 DPI (Print)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );
    }

    if (action === 'pdfToWord') {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase font-black">Layout Mode</Label>
                    <Select value={config.layout} onValueChange={(v: string) => updateConfig('layout', v)}>
                        <SelectTrigger className="bg-slate-900 border-white/5">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="preserve">Preserve Layout (Clustered)</SelectItem>
                            <SelectItem value="editable">Highly Editable (Flowing)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-white">Detect Tables</Label>
                        <p className="text-[10px] text-slate-500 uppercase">Automatic cell reconstruction</p>
                    </div>
                    <Switch
                        checked={config.tables}
                        onCheckedChange={(v: boolean) => updateConfig('tables', v)}
                        className="data-[state=checked]:bg-purple-600"
                    />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-white">Extract Images</Label>
                        <p className="text-[10px] text-slate-500 uppercase">Keep high-res vectors/bitmaps</p>
                    </div>
                    <Switch
                        checked={config.images}
                        onCheckedChange={(v: boolean) => updateConfig('images', v)}
                        className="data-[state=checked]:bg-purple-600"
                    />
                </div>
            </div>
        );
    }

    if (action === 'ocr') {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase font-black">Primary Language</Label>
                    <Select value={config.language} onValueChange={(v: string) => updateConfig('language', v)}>
                        <SelectTrigger className="bg-slate-900 border-white/5">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="eng">English</SelectItem>
                            <SelectItem value="deu">German</SelectItem>
                            <SelectItem value="fra">French</SelectItem>
                            <SelectItem value="spa">Spanish</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-white">Deskew Pages</Label>
                        <p className="text-[10px] text-slate-500 uppercase">Straighten crooked scans</p>
                    </div>
                    <Switch
                        checked={config.deskew}
                        onCheckedChange={(v: boolean) => updateConfig('deskew', v)}
                        className="data-[state=checked]:bg-purple-600"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p className="text-xs uppercase font-black tracking-widest text-slate-500">No Advanced Settings</p>
            <p className="text-[10px] text-slate-600">Standard conversion pipeline will be used.</p>
        </div>
    );
}

const AlertCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);
