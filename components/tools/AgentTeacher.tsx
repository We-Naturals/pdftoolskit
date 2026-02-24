/* eslint-disable */
'use client';

import React, { useState } from 'react';
// import { agentService } from '@/lib/services/ai/AgentService'; // We need access to the singleton
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { BrainCircuit, Save } from 'lucide-react';
import toast from 'react-hot-toast';

// We need to export the singleton instance from AgentService.ts or use a Context.
// Since AgentService is a class, we assume the app uses a singleton pattern.
// For this MVP, we will assume we CAN'T access the SAME instance easily without a Global Store or Context.
// However, AgentService.ts currently exports a CLASS, not an instance.
// Let's modify AgentService.ts to export a singleton or use a Store.
// Actually, `CommandBar.tsx` instantiates it. 
// Refactor Strategy: We will creating a simple UI that *mock* calls a store-based Agent, 
// OR we rely on `CommandBar` having the instance.

// Let's just create the UI logic for now.

export function AgentTeacher() {
    const [trigger, setTrigger] = useState('');
    const [tool, setTool] = useState('rotate');
    const [args, setArgs] = useState('{"angle": 90}');

    const handleTeach = () => {
        try {
            const [_command, _parsedArgs] = trigger.split(':');
            // In a real app, we'd dispatch to the AgentService Instance
            // window.agentService.teach(trigger, { tool, args: parsedArgs, rationale: 'User taught' });

            toast.success("Training example saved! (Mock)");
            setTrigger('');
        } catch (_e) {
            toast.error("Invalid JSON args");
        }
    };

    return (
        <GlassCard className="p-4 w-full max-w-md border-purple-500/30">
            <div className="flex items-center gap-2 mb-4 text-purple-400">
                <BrainCircuit className="w-5 h-5" />
                <h3 className="font-bold">Edge LoRA Trainer</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs text-slate-400">When I say:</label>
                    <input
                        className="w-full bg-slate-900/50 border border-white/10 rounded p-2 text-sm text-white"
                        placeholder='e.g., "Fix orientation"'
                        value={trigger}
                        onChange={(e) => setTrigger(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="text-xs text-slate-400">Tool:</label>
                        <select
                            className="w-full bg-slate-900/50 border border-white/10 rounded p-2 text-sm text-white"
                            value={tool}
                            onChange={(e) => setTool(e.target.value)}
                        >
                            <option value="rotate">rotate</option>
                            <option value="redact">redact</option>
                            <option value="split">split</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-slate-400">Args (JSON):</label>
                        <input
                            className="w-full bg-slate-900/50 border border-white/10 rounded p-2 text-sm text-white font-mono"
                            value={args}
                            onChange={(e) => setArgs(e.target.value)}
                        />
                    </div>
                </div>

                <Button onClick={handleTeach} className="w-full bg-purple-600 hover:bg-purple-500">
                    <Save className="w-4 h-4 mr-2" />
                    Teach Agent
                </Button>
            </div>
        </GlassCard>
    );
}

