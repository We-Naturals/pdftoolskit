/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { Unlock, Key, ShieldCheck, Eye, EyeOff, Activity } from 'lucide-react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { unlockPDF, analyzeSecurity } from '@/lib/pdf-utils';
import { tools } from '@/data/tools';
import { GlassCard } from '@/components/ui/GlassCard';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function UnlockTool() {
    const tool = tools.find(t => t.id === 'unlockPdf')!;
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [securityStatus, setSecurityStatus] = useState<'analyzing' | 'open-locked' | 'owner-locked' | 'unlocked' | null>(null);

    const handleUnlock = async (file: File) => {
        const fileData = await file.arrayBuffer();
        const result = await globalWorkerPool.runTask<Uint8Array>('UNLOCK_PDF', {
            fileData,
            password
        });
        return new Blob([result as any], { type: 'application/pdf' });
    };

    const handleFileAdded = async (file: File) => {
        setSecurityStatus('analyzing');
        try {
            const fileData = await file.arrayBuffer();
            const analysis = await globalWorkerPool.runTask<any>('ANALYZE_SECURITY', { fileData });
            if (analysis.isOpenLocked) {
                setSecurityStatus('open-locked');
            } else if (analysis.isOwnerLocked) {
                setSecurityStatus('owner-locked');
            } else {
                setSecurityStatus('unlocked');
            }
        } catch (err) {
            setSecurityStatus('open-locked');
        }
    };

    const renderOptions = () => (
        <div className="space-y-6">
            {securityStatus === 'analyzing' && (
                <div className="flex items-center justify-center p-8 bg-slate-900/50 rounded-xl border border-slate-800">
                    <Activity className="w-5 h-5 text-emerald-500 animate-spin mr-3" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analyzing Encryption...</span>
                </div>
            )}

            {securityStatus === 'open-locked' && (
                <GlassCard className="p-4 border-red-500/20 bg-red-500/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                        <Key className="w-4 h-4 text-red-400" />
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Bunker Locked</span>
                    </div>

                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Enter Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                                placeholder="••••••••"
                            />
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </GlassCard>
            )}

            {securityStatus === 'owner-locked' && (
                <GlassCard className="p-4 border-orange-500/20 bg-orange-500/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-orange-400" />
                        <div>
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block">Permission Restrictions Found</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Ready to strip security layers.</span>
                        </div>
                    </div>

                    <div className="relative mt-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Enter Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-all font-mono"
                                placeholder="••••••••"
                            />
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </GlassCard>
            )}

            {securityStatus === 'unlocked' && (
                <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                        <Unlock className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">No Encryption Detected</span>
                    </div>
                </GlassCard>
            )}

            <div className="flex items-start gap-2 text-[9px] text-slate-500 p-2 uppercase font-black tracking-tighter">
                <ShieldCheck className="w-3 h-3 text-emerald-500 mt-0.5" />
                <span>Zero-Knowledge Proof: Decryption occurs locally in your hardware bunker.</span>
            </div>
        </div>
    );

    return (
        <TransformerShell
            tool={tool}
            engine={handleUnlock as any}
            onFileAdded={handleFileAdded}
            renderSettings={renderOptions as any}
            autoDownload={true}
            filenamePrefix="Unlocked"
        />
    );
}
