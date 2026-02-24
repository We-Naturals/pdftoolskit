'use client';

import React from 'react';
import { Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    objectId: string;
    onClose: () => void;
    onAction: (action: 'front' | 'back' | 'duplicate' | 'delete') => void;
}

export const ContextMenu = ({ x, y, _objectId, onClose, onAction }: ContextMenuProps & { _objectId?: string }) => {
    return (
        <div
            className="fixed z-[100] bg-slate-800 border border-slate-700 shadow-2xl rounded-lg p-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-200"
            style={{ left: x, top: y }}
            onMouseLeave={onClose}
        >
            <button
                onClick={() => { onAction('duplicate'); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors"
            >
                <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>
            <div className="h-px bg-slate-700 my-1" />
            <button
                onClick={() => { onAction('front'); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors"
            >
                <ArrowUp className="w-3.5 h-3.5" /> Bring to Front
            </button>
            <button
                onClick={() => { onAction('back'); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors"
            >
                <ArrowDown className="w-3.5 h-3.5" /> Send to Back
            </button>
            <div className="h-px bg-slate-700 my-1" />
            <button
                onClick={() => { onAction('delete'); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded transition-colors"
            >
                <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
        </div>
    );
};
