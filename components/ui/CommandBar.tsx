
'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Loader2, Terminal } from 'lucide-react';
import { AgentService } from '@/lib/services/ai/AgentService';
import { useEditStore } from '@/lib/stores/edit-store';
import { useFileStore } from '@/lib/stores/file-store';
import toast from 'react-hot-toast';

export function CommandBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [status, setStatus] = useState('');
    const [agent] = useState(() => new AgentService());

    // Toggle with Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
                // Initialize agent on first open to save bandwidth
                agent.initialize((s) => setStatus(s));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [agent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setIsThinking(true);
        setStatus('Thinking...');
        try {
            // Updated to use the new Planner
            const plan = await agent.plan(input);

            if (plan && plan.length > 0) {
                toast.success(`Agent: Planned ${plan.length} actions`);

                // Execute sequentially
                for (const command of plan) {
                    setStatus(`Executing: ${command.tool} - ${command.rationale}`);

                    const editStore = useEditStore.getState();
                    const fileStore = useFileStore.getState();

                    if (command.tool === 'rotate') {
                        const angle = command.args.angle || 90;
                        const direction = angle === 90 ? 'cw' : 'ccw';
                        fileStore.rotateAllPages(direction);
                        toast.success(`Rotated (${direction.toUpperCase()})`);
                    } else if (command.tool === 'redact') {
                        editStore.setActiveTool('redact');
                        toast.success('Redaction tool activated');
                        // In a real agent, we might auto-draw a bbox here
                    } else if (command.tool === 'split') {
                        toast('Split mode activated');
                    } else if (command.tool === 'grayscale') {
                        toast('Converted to Grayscale (Simulated)');
                    }

                    // Artificial delay for UX visibility
                    await new Promise(r => setTimeout(r, 800));
                }

                setInput('');
                setTimeout(() => setIsOpen(false), 1000);
            } else {
                toast.error("I didn't understand that command.");
            }
        } catch (_error) {
            toast.error("Agent failed to respond.");
        } finally {
            setIsThinking(false);
            setStatus('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-2xl bg-[#0f111a] border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden ring-1 ring-cyan-500/50">
                <form onSubmit={handleSubmit} className="relative flex items-center p-4">
                    <Sparkles className={`w-6 h-6 mr-4 ${isThinking ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                    <input
                        autoFocus
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask the Agent to do something (e.g., 'Rotate this page', 'Redact text')..."
                        className="flex-1 bg-transparent text-lg text-white placeholder-slate-500 focus:outline-none font-medium"
                    />
                    {isThinking ? (
                        <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 bg-slate-900 px-2 py-1 rounded border border-white/5">Esc to close</span>
                            <button type="submit" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <ArrowRight className="w-5 h-5 text-cyan-500" />
                            </button>
                        </div>
                    )}
                </form>

                {status && (
                    <div className="px-4 py-2 bg-slate-900/50 border-t border-white/5 flex items-center gap-2 text-xs text-cyan-400 font-mono">
                        <Terminal className="w-3 h-3" />
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}
