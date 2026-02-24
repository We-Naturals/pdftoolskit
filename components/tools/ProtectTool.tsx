/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { Lock, Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { TransformerShell } from '@/components/shells/TransformerShell';
import { protectPDF } from '@/lib/pdf-utils';
import { tools } from '@/data/tools';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

import { globalWorkerPool } from '@/lib/utils/worker-pool';

export function ProtectTool() {
    const tool = tools.find(t => t.id === 'protectPdf')!;
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [ownerPassword, setOwnerPassword] = useState('');
    const [permissions, setPermissions] = useState({
        printing: false,
        copying: false,
        modifying: false
    });

    const handleProtect = async (file: File) => {
        if (!password) throw new Error('Password is required');
        if (password !== confirmPassword) throw new Error('Passwords do not match');

        const fileData = await file.arrayBuffer();
        const result = await globalWorkerPool.runTask<Uint8Array>('PROTECT_PDF', {
            fileData,
            options: {
                userPassword: password,
                ownerPassword: ownerPassword || undefined,
                permissions: {
                    printing: permissions.printing ? 'highResolution' : 'none',
                    copying: permissions.copying,
                    modifying: permissions.modifying,
                    annotating: permissions.modifying,
                    fillingForms: permissions.modifying,
                    contentAccessibility: permissions.copying,
                    documentAssembly: permissions.modifying
                }
            }
        });
        return new Blob([result as any], { type: 'application/pdf' });
    };

    const renderOptions = () => (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="relative">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Document Open Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-all font-mono"
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

                <div className="relative">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Confirm Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-[10px] uppercase font-bold tracking-widest border border-white/5"
            >
                {showAdvanced ? 'Hide Advanced Security' : 'Show Advanced Security'}
            </Button>

            {showAdvanced && (
                <GlassCard className="p-4 border-orange-500/20 bg-orange-500/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div>
                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 block">Owner Password (Master)</label>
                        <input
                            type="password"
                            value={ownerPassword}
                            onChange={(e) => setOwnerPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-orange-500/20 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Restricted Actions</p>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={!permissions.printing}
                                onChange={(e) => setPermissions({ ...permissions, printing: !e.target.checked })}
                                className="w-3 h-3 rounded bg-slate-900 border-slate-700 text-orange-500"
                            />
                            <span className="text-[10px] text-slate-400 group-hover:text-white uppercase font-bold">Disable Printing</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={!permissions.copying}
                                onChange={(e) => setPermissions({ ...permissions, copying: !e.target.checked })}
                                className="w-3 h-3 rounded bg-slate-900 border-slate-700 text-orange-500"
                            />
                            <span className="text-[10px] text-slate-400 group-hover:text-white uppercase font-bold">Disable Copy/Paste</span>
                        </label>
                    </div>
                </GlassCard>
            )}

            <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl flex gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-[10px] text-red-400/80 leading-relaxed uppercase font-medium">
                    Warning: We do not store passwords. If you lose this password, the document cannot be recovered.
                </p>
            </div>
        </div>
    );

    return (
        <TransformerShell
            tool={tool}
            engine={handleProtect as any}
            renderSettings={renderOptions as any}
            autoDownload={true}
            filenamePrefix="Protected"
        />
    );
}
