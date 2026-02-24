'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { tools } from '@/data/tools';
import { getNextSteps } from '@/lib/utils/workflow-engine';
import { WorkflowIntelligence, WorkflowRecommendation } from '@/lib/ai/workflow-intelligence';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

interface NextStepsProps {
    currentToolId: string;
    fileBuffer?: ArrayBuffer | null;
    className?: string;
}

export function NextSteps({ currentToolId, fileBuffer, className }: NextStepsProps) {
    const [aiRecs, setAiRecs] = React.useState<WorkflowRecommendation[]>([]);

    React.useEffect(() => {
        if (fileBuffer) {
            WorkflowIntelligence.analyze(fileBuffer).then(setAiRecs);
        }
    }, [fileBuffer]);

    const staticToolIds = getNextSteps(currentToolId);

    // Merge AI recs with static ones
    const aiToolIds = aiRecs.map(r => r.toolId);
    const combinedIds = Array.from(new Set([...aiToolIds, ...staticToolIds]));

    const suggestedTools = combinedIds
        .map(id => tools.find(t => t.id === id))
        .filter(Boolean)
        .slice(0, 3);

    if (suggestedTools.length === 0) return null;

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Recommended Next Steps
                </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {suggestedTools.map((tool) => (
                    tool && (
                        <Link
                            key={tool.id}
                            href={tool.href}
                            className="group"
                        >
                            <GlassCard className="p-4 h-full border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-300 flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-lg shadow-indigo-500/10",
                                        tool.color
                                    )}>
                                        <tool.icon className="w-4 h-4" />
                                    </div>
                                    <h5 className="text-white text-xs font-bold font-mono tracking-tight group-hover:text-indigo-400 transition-colors">
                                        {tool.name}
                                    </h5>
                                </div>
                                <div className="mt-3 flex items-center gap-1 text-[9px] font-black uppercase text-indigo-500/60 group-hover:text-indigo-400">
                                    Continue <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                                </div>
                            </GlassCard>
                        </Link>
                    )
                ))}
            </div>
        </div>
    );
}
