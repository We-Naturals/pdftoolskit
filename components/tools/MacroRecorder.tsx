/* eslint-disable */

import React, { useState } from 'react';
import { Workflow } from '@/lib/stores/macro-store';
import { Play, Square, Trash2, List } from 'lucide-react';
import { useMacroStore } from '@/lib/stores/macro-store';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { WorkflowEngine } from '@/lib/workflow/WorkflowEngine';
import toast from 'react-hot-toast';

export function MacroRecorder({ targetFile }: { targetFile: File | null }) {
    const { isRecording, startRecording, stopRecording, savedWorkflows, deleteWorkflow } = useMacroStore();
    const [isOpen, setIsOpen] = useState(false);
    const [workflowName, setWorkflowName] = useState('');

    const handleStop = () => {
        if (!workflowName.trim()) {
            toast.error("Please name your macro");
            return;
        }
        stopRecording(workflowName);
        setWorkflowName('');
        toast.success("Macro Saved!");
    };

    const handlePlay = async (workflow: Workflow) => {
        if (!targetFile) {
            toast.error("Please upload a file first to run this macro");
            return;
        }

        try {
            const toastId = toast.loading(`Running Macro: ${workflow.name}...`);
            const resultFile = await WorkflowEngine.executeWorkflow(targetFile, workflow);

            // Trigger download
            const url = URL.createObjectURL(resultFile);
            const a = document.createElement('a');
            a.href = url;
            a.download = `macro_${workflow.name}_${targetFile.name}`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success("Macro Executed Successfully!", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Macro Execution Failed");
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {isOpen && (
                <GlassCard className="w-80 p-4 animate-in slide-in-from-right-10 border-indigo-500/30 shadow-2xl">
                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <List className="w-4 h-4 text-indigo-400" />
                            Macro Library
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                    </div>

                    {/* Recording Controls */}
                    <div className="mb-6 p-3 bg-black/20 rounded-xl">
                        {!isRecording ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={startRecording}
                                className="w-full bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                            >
                                <div className="w-2 h-2 rounded-full bg-rose-500 mr-2 animate-pulse" />
                                Start New Recording
                            </Button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                    Recording...
                                </div>
                                <input
                                    type="text"
                                    value={workflowName}
                                    onChange={(e) => setWorkflowName(e.target.value)}
                                    placeholder="Macro Name (e.g., 'Rotate & Fix')"
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white mb-2"
                                />
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleStop}
                                    className="w-full bg-rose-600 hover:bg-rose-500"
                                    icon={<Square className="w-3 h-3 fill-current" />}
                                >
                                    Stop & Save
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Saved Macros */}
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {savedWorkflows.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-4">No saved macros yet.</p>
                        )}
                        {savedWorkflows.map(w => (
                            <div key={w.id} className="group bg-slate-800/50 p-3 rounded-lg flex items-center justify-between hover:bg-slate-800 transition-colors border border-white/5">
                                <div>
                                    <div className="font-bold text-sm text-white">{w.name}</div>
                                    <div className="text-[10px] text-slate-400">{w.actions.length} steps • {new Date(w.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handlePlay(w)}
                                        className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500 hover:text-white transition-colors"
                                        disabled={!targetFile}
                                        title={!targetFile ? "Upload a file to run" : "Run Macro"}
                                    >
                                        <Play className="w-3 h-3 fill-current" />
                                    </button>
                                    <button
                                        onClick={() => deleteWorkflow(w.id)}
                                        className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 ${isRecording
                    ? 'bg-rose-500 text-white animate-pulse border-4 border-rose-900'
                    : 'bg-indigo-600 text-white border-2 border-indigo-400'
                    }`}
            >
                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <List className="w-6 h-6" />}
            </button>
        </div>
    );
}

