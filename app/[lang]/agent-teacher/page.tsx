
'use client';

import { AgentTeacher } from '@/components/tools/AgentTeacher';
import { ToolHeader } from '@/components/shared/ToolHeader';
import { BrainCircuit } from 'lucide-react';

export default function AgentTeacherPage() {
    return (
        <div className="container mx-auto py-12 px-4 selection:bg-purple-500/30">
            <ToolHeader
                title="Agent Teach Mode"
                description="Train the Local AI with Few-Shot Examples (Edge LoRA)."
                icon={BrainCircuit}
                toolId="agent-teacher"
                color="from-indigo-500 to-purple-600"
            />
            <div className="flex justify-center">
                <AgentTeacher />
            </div>
        </div>
    );
}
