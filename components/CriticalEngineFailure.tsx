import React from 'react';
import { AlertTriangle, RefreshCcw, ShieldAlert } from 'lucide-react';

/**
 * PHASE 51.1: CRITICAL ENGINE FAILURE UI
 * Prevents silent failures when WASM binaries fail to load or corrupt.
 */
interface CriticalEngineFailureProps {
    error: string;
    onReset: () => void;
}

export const CriticalEngineFailure: React.FC<CriticalEngineFailureProps> = ({ error, onReset }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-red-500/50 bg-red-50/5 rounded-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-300">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full animate-pulse" />
                <CircleAlert className="w-16 h-16 text-red-500 relative z-10" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Apex Engine Fault</h2>
            <p className="text-red-200/70 text-center mb-6 max-w-md">
                The high-fidelity rendering core encountered a critical load failure.
                Forensic security protocols have halted the operation to prevent data corruption.
            </p>

            <div className="bg-black/40 p-4 rounded-lg w-full mb-8 font-mono text-sm text-red-400 border border-red-500/20">
                <code>{error}</code>
            </div>

            <button
                onClick={onReset}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            >
                <RefreshCcw className="w-4 h-4" />
                Reload Secure Core
            </button>

            <div className="mt-8 flex items-center gap-4 text-xs text-white/30 uppercase tracking-widest">
                <div className="flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Forensic Lock Active
                </div>
                <div className="w-1 h-1 bg-white/10 rounded-full" />
                <div>Ref: APEX-WASM-INIT-ERR</div>
            </div>
        </div>
    );
};

const CircleAlert = ({ className }: { className?: string }) => (
    <div className={className}>
        <AlertTriangle className="w-full h-full" />
    </div>
);
