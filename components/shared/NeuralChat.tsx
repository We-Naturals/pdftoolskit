
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    Bot,
    User,
    Loader2,
    X,
    Sparkles,
    MessageSquare,
    Brain
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { ragEngine, ChatMessage } from '@/lib/ai/rag-engine';
import { modelLoader, ModelProgress } from '@/lib/ai/model-loader';
import toast from 'react-hot-toast';

interface NeuralChatProps {
    documentText: string;
    file: File;
    onClose?: () => void;
}

export function NeuralChat({ documentText, file, onClose }: NeuralChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: "I've analyzed the document. Ask me anything about it!" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isIndexing, setIsIndexing] = useState(true);
    const [modelProgress, setModelProgress] = useState<ModelProgress | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial indexing
        const init = async () => {
            try {
                await ragEngine.indexDocument(documentText, file);
                setIsIndexing(false);
            } catch (e) {
                console.error("Indexing failed", e);
                toast.error("Failed to index document for chat");
                setIsIndexing(false);
            }
        };

        init();

        // Listen for model loading progress
        modelLoader.onProgress((p) => {
            setModelProgress(p);
        });
    }, [documentText, file]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || isIndexing) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
            setMessages(prev => [...prev, assistantMessage]);

            const stream = ragEngine.ask(input, messages);

            for await (const chunk of stream) {
                assistantMessage.content += chunk;
                setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { ...assistantMessage };
                    return next;
                });
            }
        } catch (e) {
            console.error("Chat failed", e);
            toast.error("AI engine encountered an error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <GlassCard className="flex flex-col h-[500px] border-teal-500/20 shadow-2xl shadow-teal-500/10 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                        <Brain className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white leading-none">Neural Assistant</h4>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Local RAG Engine</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Progress / Status Overlay */}
            {(isIndexing || (modelProgress && modelProgress.status !== 'Ready')) && (
                <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                    <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
                    <h5 className="text-white font-bold mb-2">
                        {isIndexing ? "Indexing Document..." : "Loading Neural Weights..."}
                    </h5>
                    <p className="text-xs text-slate-400 max-w-[200px]">
                        {modelProgress?.status || "Synthesizing vector space..."}
                    </p>
                    {modelProgress && modelProgress.progress > 0 && (
                        <div className="w-full max-w-[200px] h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                            <div
                                className="h-full bg-teal-500 transition-all duration-300"
                                style={{ width: `${modelProgress.progress * 100}%` }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Message Area */}
            <div
                ref={scrollRef}
                className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/5"
            >
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${msg.role === 'user'
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                            : 'bg-teal-500/20 border-teal-500/40 text-teal-400'
                            }`}>
                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.role === 'user'
                            ? 'bg-indigo-600/20 text-indigo-50 border border-indigo-500/20 rounded-tr-none'
                            : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none'
                            }`}>
                            {msg.content}
                            {isLoading && idx === messages.length - 1 && !msg.content && (
                                <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-teal-500/50 rounded-full animate-bounce" />
                                    <span className="w-1.5 h-1.5 bg-teal-500/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1.5 h-1.5 bg-teal-500/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-white/5">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about this document..."
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors"
                        disabled={isLoading || isIndexing}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || isIndexing || !input.trim()}
                        className="absolute right-2 top-2 p-1.5 rounded-lg bg-teal-600 text-white disabled:opacity-50 disabled:bg-slate-800 transition-all hover:bg-teal-500"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="mt-2 flex items-center gap-2 px-1">
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">
                        Neural Intelligence Powered by local Phi-3
                    </span>
                </div>
            </div>
        </GlassCard>
    );
}
