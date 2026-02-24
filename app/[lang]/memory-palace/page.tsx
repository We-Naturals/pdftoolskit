
'use client';

import dynamic from 'next/dynamic';
const MemoryPalaceView = dynamic(() => import('@/components/views/MemoryPalaceView').then(mod => mod.MemoryPalaceView), {
    ssr: false,
});
import { ToolHeader } from '@/components/shared/ToolHeader';
import { Box } from 'lucide-react';

export default function MemoryPalacePage() {
    return (
        <div className="container mx-auto py-12 px-4 selection:bg-purple-500/30">
            <ToolHeader
                title="Memory Palace"
                description="Spatial Document Management in 3D (WebXR)."
                icon={Box}
                toolId="memory-palace"
                color="from-purple-500 to-pink-600"
            />
            <MemoryPalaceView />
        </div>
    );
}
