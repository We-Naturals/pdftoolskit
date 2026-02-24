
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Send, Bot, User, Sparkles, Loader2, Info } from 'lucide-react';
import { modelLoader, type ModelProgress } from '@/lib/ai/model-loader';
import { vectorStore } from '@/lib/ai/vector-store';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    citations?: { text: string; page?: number }[];
}

export function ChatPanel() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [progress, setProgress] = useState<ModelProgress | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        modelLoader.onProgress((p) => setProgress(p));
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // 1. Context Retrieval (RAG)
            const contextResults = await vectorStore.query(input, 3);
            const contextText = contextResults.map(r => r.text).join('\n\n');

            // 2. Local LLM Completion
            const systemPrompt = `You are a helpful PDF assistant. Use the following context to answer the user's question. If the answer isn't in the context, say you don't know based on the document.
            Context:
            ${contextText}`;

            const chatMessages = [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: input }
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stream = await modelLoader.chat(chatMessages as any);

            let assistantContent = '';
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content || '';
                assistantContent += delta;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = assistantContent;
                    return newMessages;
                });
            }

            // Add citations if needed (omitted for brevity in MVP output)
        } catch (error) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error with the local AI engine.' }]);
        } finally {
            setIsTyping(false);
            setProgress(null);
        }
    };

    return (
        <GlassCard className="flex flex-col h-[600px] border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-xl">
                        <Bot className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white">Intelligence Core</h4>
                        <p className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Local-First Privacy
                        </p>
                    </div>
                </div>
                {progress && progress.status !== 'Ready' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                        <span className="text-[10px] text-slate-400 font-medium">Downloading Weights: {Math.round(progress.progress * 100)}%</span>
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <Bot className="w-12 h-12 text-slate-400 mb-4" />
                        <h5 className="text-sm font-bold text-white mb-2">No conversation yet</h5>
                        <p className="text-xs text-slate-500 max-w-[200px]">Ask anything about your document. Data never leaves your device.</p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`p-2 rounded-xl h-fit ${m.role === 'user' ? 'bg-indigo-500/20' : 'bg-white/5 border border-white/5'}`}>
                                {m.role === 'user' ? <User className="w-4 h-4 text-indigo-400" /> : <Bot className="w-4 h-4 text-purple-400" />}
                            </div>
                            <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-900/50 text-slate-200 border border-white/5 shadow-xl rounded-tl-none'}`}>
                                {/* @ts-expect-error ReactMarkdown version conflict */}
                                <ReactMarkdown className="prose prose-invert prose-sm">
                                    {m.content}
                                </ReactMarkdown>
                                {m.citations && m.citations.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {m.citations.map((c, ci) => (
                                            <span key={ci} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-slate-400 border border-white/5 cursor-help hover:bg-white/10 transition-colors">
                                                Page {c.page || '?'}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && !progress && (
                    <div className="flex gap-3">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                            <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
                        </div>
                        <div className="bg-slate-900/50 rounded-2xl p-4 flex gap-1 items-center">
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <div className="relative flex items-end gap-2">
                    <textarea
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Ask your PDF anything..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none min-h-[46px] max-h-[120px]"
                    />
                    <Button
                        size="sm"
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="rounded-xl h-[46px] w-[46px] bg-purple-600 hover:bg-purple-500 shrink-0"
                    >
                        {isTyping ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                    </Button>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-500">
                    <Info className="w-3 h-3" />
                    AI can make mistakes. All processing stays local.
                </div>
            </div>
        </GlassCard>
    );
}
