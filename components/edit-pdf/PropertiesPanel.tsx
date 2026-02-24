'use client';

import React from 'react';
import { useEditStore, FabricObject } from '@/lib/stores/edit-store';
import { useShallow } from 'zustand/react/shallow';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Bold, Italic, Trash2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GOOGLE_FONTS, loadFont } from '@/lib/fonts';
import toast from 'react-hot-toast';

const COLORS = ['#000000', '#FFFFFF', '#FF0000', '#0000FF', '#009900', '#FFFF00'];

export function PropertiesPanel() {
    const activePageId = useEditStore(state => state.activePageId);
    const selectedObjectIds = useEditStore(useShallow(state => state.selectedObjectIds));
    // eslint-disable-next-line security/detect-object-injection
    const objects = useEditStore(useShallow(state => state.objects[activePageId || ''] || []));
    const updateSelected = useEditStore(state => state.updateSelected);
    const removeObject = useEditStore(state => state.removeObject);
    const reorderObject = useEditStore(state => state.reorderObject);

    // Derived Selection State
    const selectedObjects = React.useMemo(() => {
        if (!activePageId || selectedObjectIds.size === 0) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageObjects = objects as any[] || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return pageObjects.filter((obj: any) => selectedObjectIds.has(obj.id));
    }, [activePageId, selectedObjectIds, objects]);

    const selectedObject = selectedObjects[0];

    if (!activePageId) return null;

    // If nothing selected, show placeholder or document props
    if (selectedObjects.length === 0) {
        return (
            <div className="sticky top-24">
                <GlassCard className="p-5 min-h-[200px] flex flex-col items-center justify-center text-slate-400 text-sm">
                    <p>Select an element to edit</p>
                </GlassCard>
            </div>
        );
    }

    // Determine type (if mixed, might show limited props)
    const primaryType = selectedObjects[0].type;
    const isMulti = selectedObjects.length > 1;

    // Helper to getting common value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getValue = (key: keyof FabricObject, defaultValue: any) => {
        if (selectedObjects.length === 0) return defaultValue;
        // eslint-disable-next-line security/detect-object-injection
        const val = selectedObjects[0][key];
        // If multi-select and values differ, maybe return null or special "mixed" value?
        // For now, return first object's value
        return val !== undefined ? val : defaultValue;
    };

    const handleDelete = () => {
        if (!activePageId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        selectedObjects.forEach((obj: any) => removeObject(activePageId, obj.id));
    };

    return (
        <div className="sticky top-24 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <GlassCard className="flex flex-col p-5 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                    <h3 className="text-white font-semibold">
                        {isMulti ? `${selectedObjects.length} Selected` : primaryType.charAt(0).toUpperCase() + primaryType.slice(1)}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-400 hover:bg-red-500/10 h-8 w-8 p-0">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                {/* Text Properties */}
                {primaryType === 'text' && (
                    <div className="space-y-4">
                        {/* Text Content */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs text-slate-400">Content</label>
                                <button
                                    onClick={async () => {
                                        const currentText = getValue('text', '');
                                        if (!currentText) return;
                                        toast.loading("Refining with local AI...", { id: 'ai-fix' });
                                        try {
                                            const { modelLoader } = await import('@/lib/ai/model-loader');
                                            const engine = await modelLoader.getEngine();
                                            const response = await engine.chat.completions.create({
                                                messages: [
                                                    { role: 'system', content: 'You are a grammar and clarity specialist. Improve the provided text while keeping it professional and the same length. Return ONLY the improved text.' },
                                                    { role: 'user', content: currentText }
                                                ],
                                                temperature: 0.1
                                            });
                                            const improved = response.choices[0]?.message.content || currentText;
                                            updateSelected({ text: improved });
                                            toast.success("Intelligence Applied", { id: 'ai-fix' });
                                        } catch (_e) {
                                            toast.error("AI Engine offline", { id: 'ai-fix' });
                                        }
                                    }}
                                    className="text-[10px] font-black text-violet-400 uppercase tracking-tighter hover:text-violet-300 transition-colors flex items-center gap-1"
                                >
                                    <Zap className="w-3 h-3" /> Neural Fix
                                </button>
                            </div>
                            <textarea
                                value={getValue('text', '')}
                                onChange={(e) => updateSelected({ text: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm min-h-[80px]"
                            />
                        </div>

                        {/* Font Family */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Font</label>
                            <select
                                value={getValue('fontFamily', 'Helvetica')}
                                onChange={async (e) => {
                                    const font = e.target.value;
                                    try {
                                        await loadFont(font);
                                        updateSelected({ fontFamily: font });
                                    } catch (_err) {
                                        toast.error(`Failed to load font ${font}`);
                                    }
                                }}
                                className="w-full bg-slate-800 rounded p-2 text-white border border-slate-600 text-xs"
                            >
                                <option value="Helvetica">Helvetica</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Arial">Arial</option>
                                <optgroup label="Google Fonts">
                                    {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                </optgroup>
                            </select>
                        </div>

                        {/* Size & Color */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-slate-400 mb-1 block">Size</label>
                                <input
                                    type="number"
                                    value={getValue('fontSize', 20)}
                                    onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-slate-400 mb-1 block">Color</label>
                                <input
                                    type="color"
                                    value={getValue('fill', '#000000')}
                                    onChange={(e) => updateSelected({ fill: e.target.value })}
                                    className="w-full h-9 rounded cursor-pointer bg-slate-900 border border-slate-600 p-1"
                                />
                            </div>
                        </div>

                        {/* Quick Colors */}
                        <div className="flex gap-1 flex-wrap">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => updateSelected({ fill: c })}
                                    className={cn(
                                        "w-6 h-6 rounded border border-slate-600",
                                        getValue('fill', '') === c ? "ring-2 ring-blue-500" : ""
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        {/* Style & Alignment */}
                        <div className="flex gap-2 bg-slate-800 p-1 rounded">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("flex-1 h-8", getValue('fontWeight', 'normal') === 'bold' && "bg-slate-700")}
                                onClick={() => updateSelected({ fontWeight: getValue('fontWeight', 'normal') === 'bold' ? 'normal' : 'bold' })}
                            >
                                <Bold className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("flex-1 h-8", getValue('fontStyle', 'normal') === 'italic' && "bg-slate-700")}
                                onClick={() => updateSelected({ fontStyle: getValue('fontStyle', 'normal') === 'italic' ? 'normal' : 'italic' })}
                            >
                                <Italic className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Generic Position (All Objects) */}
                <div className="pt-4 border-t border-slate-700 space-y-4">
                    <label className="text-xs text-slate-400 mb-1 block">Position</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-500">X</label>
                            <input
                                type="number"
                                value={Math.round(getValue('left', 0))}
                                onChange={(e) => updateSelected({ left: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-white text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500">Y</label>
                            <input
                                type="number"
                                value={Math.round(getValue('top', 0))}
                                onChange={(e) => updateSelected({ top: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-white text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* Layer Management */}
                {selectedObject && (
                    <div className="pt-4 border-t border-slate-700 space-y-4">
                        <h4 className="text-white text-xs font-bold uppercase tracking-wider">Arrange</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => reorderObject(selectedObject.pageId, selectedObject.id, 'front')} className="text-xs h-8">
                                Bring to Front
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => reorderObject(selectedObject.pageId, selectedObject.id, 'back')} className="text-xs h-8">
                                Send to Back
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => reorderObject(selectedObject.pageId, selectedObject.id, 'forward')} className="text-xs h-8">
                                Bring Forward
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => reorderObject(selectedObject.pageId, selectedObject.id, 'backward')} className="text-xs h-8">
                                Send Backward
                            </Button>
                        </div>
                    </div>
                )}

                {selectedObject && (
                    <div className="pt-4 border-t border-slate-700">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => removeObject(selectedObject.pageId, selectedObject.id)}
                            className="w-full text-red-400 hover:text-red-300 gap-2 border-red-950/30 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Object
                        </Button>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
