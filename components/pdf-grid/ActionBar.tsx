import React from 'react';
import { RotateCw, RotateCcw, Trash2, X } from 'lucide-react';
import { useFileStore } from '@/lib/stores/file-store';
import { Button } from '@/components/ui/Button';
// import { cn } from '@/lib/utils';

export function ActionBar() {
    const selectedPageIds = useFileStore((state) => state.selectedPageIds);
    const deselectAll = useFileStore((state) => state.deselectAll);
    const rotateSelected = useFileStore((state) => state.rotateSelected);
    const deleteSelected = useFileStore((state) => state.deleteSelected);

    if (selectedPageIds.size === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2 border-r border-slate-700/50 pr-4">
                    <span className="font-semibold text-sm whitespace-nowrap">
                        {selectedPageIds.size} Selected
                    </span>
                    <button
                        onClick={() => deselectAll()}
                        className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rotateSelected('ccw')}
                        className="text-slate-300 hover:text-white hover:bg-slate-800"
                        title="Rotate Left"
                        aria-label="Rotate Selected Pages Left"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rotateSelected('cw')}
                        className="text-slate-300 hover:text-white hover:bg-slate-800"
                        title="Rotate Right"
                        aria-label="Rotate Selected Pages Right"
                    >
                        <RotateCw className="w-4 h-4" />
                    </Button>

                    <div className="w-px h-4 bg-slate-700/50 mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSelected()}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        title="Delete"
                        aria-label="Delete Selected Pages"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
