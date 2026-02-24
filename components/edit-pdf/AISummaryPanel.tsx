
import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

interface AISummaryPanelProps {
    summary: string | null;
    isLoading: boolean;
    onClose: () => void;
}

export function AISummaryPanel({ summary, isLoading, onClose }: AISummaryPanelProps) {
    if (!summary && !isLoading) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-20 right-4 z-40 w-80"
            >
                <GlassCard className="p-4 border-cyan-500/30 shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                            <h3 className="font-semibold text-white">AI Insights</h3>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-4 bg-white/10 rounded w-3/4"></div>
                            <div className="h-4 bg-white/10 rounded w-full"></div>
                            <div className="h-4 bg-white/10 rounded w-5/6"></div>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                            {summary}
                        </div>
                    )}
                </GlassCard>
            </motion.div>
        </AnimatePresence>
    );
}
