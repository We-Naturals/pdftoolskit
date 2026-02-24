'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { CriticalEngineFailure } from '@/components/CriticalEngineFailure';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const isApexError = this.state.error?.message.toLowerCase().includes('apex') ||
                this.state.error?.message.toLowerCase().includes('wasm');

            if (isApexError) {
                return (
                    <div className="container mx-auto px-4 py-20 flex justify-center">
                        <CriticalEngineFailure
                            error={this.state.error?.message || 'Unknown Engine Fault'}
                            onReset={() => window.location.reload()}
                        />
                    </div>
                );
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 glass">
                    <div className="bg-red-500/10 p-4 rounded-full">
                        <RefreshCw className="w-8 h-8 text-red-500 animate-spin-slow" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                    <p className="text-gray-400 max-w-md">
                        We encountered an unexpected error. Please try reloading the page.
                    </p>
                    <div className="text-xs text-mono bg-black/40 p-2 rounded text-left overflow-auto max-w-md max-h-32 text-red-400 border border-white/5">
                        {this.state.error?.message}
                    </div>
                    <button
                        type="button"
                        className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all font-semibold shadow-lg shadow-blue-600/20"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
