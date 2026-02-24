'use client';

import React from 'react';
import { Brain, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tool } from '@/data/tools';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalFeatureToggleProps {
    tool: Tool;
    activeFeatures: {
        ai?: boolean;
        p2p?: boolean;
        audit?: boolean;
    };
    onToggle: (feature: 'ai' | 'p2p' | 'audit') => void;
}

export function GlobalFeatureToggle({ tool, activeFeatures, onToggle }: GlobalFeatureToggleProps) {
    if (!tool.features) return null;

    return (
        <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <AnimatePresence>
                {tool.features.ai && (
                    <motion.button
                        key="toggle-ai"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => onToggle('ai')}
                        className={cn(
                            "p-2.5 rounded-xl transition-all flex items-center gap-2 group",
                            activeFeatures.ai
                                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                : "text-slate-500 hover:text-white hover:bg-white/5"
                        )}
                        title="AI Assistant"
                    >
                        <Brain className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">AI</span>
                    </motion.button>
                )}

                {tool.features.p2p && (
                    <motion.button
                        key="toggle-p2p"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => onToggle('p2p')}
                        className={cn(
                            "p-2.5 rounded-xl transition-all flex items-center gap-2 group",
                            activeFeatures.p2p
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                : "text-slate-500 hover:text-white hover:bg-white/5"
                        )}
                        title="P2P Swarm"
                    >
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">P2P</span>
                    </motion.button>
                )}

                {tool.features.audit && (
                    <motion.button
                        key="toggle-audit"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => onToggle('audit')}
                        className={cn(
                            "p-2.5 rounded-xl transition-all flex items-center gap-2 group",
                            activeFeatures.audit
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                                : "text-slate-500 hover:text-white hover:bg-white/5"
                        )}
                        title="Audit Log"
                    >
                        <Shield className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Audit</span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
