'use client';
import React from 'react';
import Link from 'next/link';
import { tools } from '@/data/tools';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTranslation } from 'react-i18next';

import { getNextSteps } from '@/lib/utils/workflow-engine';

interface RelatedToolsProps {
    currentToolId: string;
}

export function RelatedTools({ currentToolId }: RelatedToolsProps) {
    const { t } = useTranslation('common');

    // Use the Smart Workflow Engine to find logical next steps
    const nextToolIds = getNextSteps(currentToolId);
    const relatedTools = tools.filter(t => nextToolIds.includes(t.id)).slice(0, 4);

    // Fallback if no specific next steps found
    const displayedTools = relatedTools.length > 0
        ? relatedTools
        : tools.filter(t => t.id !== currentToolId).slice(0, 4);

    return (
        <section className="py-12 border-t border-slate-800/50 mt-12">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {t('relatedTools.title', 'Explore Other Tools') as string}
                </h2>
                <p className="text-slate-400">{t('relatedTools.subtitle', 'Discover more ways to manage your PDF files') as string}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayedTools.map((tool) => (
                    <Link key={tool.id} href={tool.href} className="block group">
                        <GlassCard
                            variant="tool"
                            className="h-full p-5 hover:border-blue-500/40 transition-all duration-300"
                            animate={false}
                        >
                            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${tool.color} mb-3 group-hover:scale-110 transition-transform`}>
                                <tool.icon className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                                {t(`tools.${tool.id}`, tool.name) as string}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-2">
                                {t(`tools.${tool.id}Desc`, tool.description) as string}
                            </p>
                        </GlassCard>
                    </Link>
                ))}
            </div>
        </section>
    );
}
