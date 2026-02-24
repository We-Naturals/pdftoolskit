'use client';

import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, X, Minimize2, Maximize2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface GlobalAISidebarProps {
    isOpen: boolean;
    onClose: () => void;
    toolName: string;
    fileName?: string;
}

export function GlobalAISidebar({ isOpen, onClose, toolName, fileName }: GlobalAISidebarProps) {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: `Hello! I'm your AI assistant for ${toolName}. How can I help you with ${fileName || 'this document'} today?` }
    ]);
    const [input, setInput] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSend = () => {
        if (!input.trim()) return;

        const newMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, newMessage]);
        setInput('');

        // Simulate AI response with tool-specific suggestions
        setTimeout(() => {
            let contextTip = "";
            if (toolName.toLowerCase().includes('compress')) {
                contextTip = " TIP: I've detected high-resolution images. Using 'Extreme' mode could save up to 60% more space.";
            } else if (toolName.toLowerCase().includes('edit')) {
                contextTip = " TIP: Use the 'Auto-Detect Fields' button in the toolbar to quickly find and label form inputs.";
            }

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `I'm analyzing your request related to ${toolName}. ${contextTip} This engine is running locally for maximum privacy.`
            };
            setMessages(prev => [...prev, aiResponse]);
        }, 1000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={cn(
                        "fixed top-0 right-0 h-full z-50 p-4 transition-all duration-300",
                        isExpanded ? "w-full md:w-[600px]" : "w-full md:w-[400px]"
                    )}
                >
                    <GlassCard className="h-full flex flex-col shadow-2xl border-white/10 dark:bg-slate-900/90 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">Hyper Assistant</h4>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Local Intelligence</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors"
                                >
                                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {messages.map((m) => (
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    key={m.id}
                                    className={cn(
                                        "flex gap-4",
                                        m.role === 'user' ? "flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md",
                                        m.role === 'assistant' ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
                                    )}>
                                        {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </div>
                                    <div className={cn(
                                        "max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed",
                                        m.role === 'assistant'
                                            ? "bg-white/[0.03] text-slate-300 border border-white/5"
                                            : "bg-indigo-600 text-white"
                                    )}>
                                        {m.content}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask anything..."
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-6 pr-14 py-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-600 uppercase tracking-tighter font-bold">
                                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-indigo-500" /> Context Aware</span>
                                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-500" /> Private & Secure</span>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
