/* eslint-disable */
'use client';

import React, { memo } from 'react';
import { Grid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { useFileStore } from '@/lib/stores/file-store';
import { cn } from '@/lib/utils';
import { Scissors } from 'lucide-react';

interface SplitGridProps {
    className?: string;
    splitPoints: number[]; // Array of page indices AFTER which a split occurs (0-based)
    onToggleSplit: (pageIndex: number) => void;
}

const GUTTER_SIZE = 16;
const ITEM_HEIGHT_RATIO = 1.4;

export const SplitGrid = memo(function SplitGrid({ className, splitPoints, onToggleSplit }: SplitGridProps) {
    const pages = useFileStore((state) => state.pages);

    // Cell Renderer
    const Cell = ({ columnIndex, rowIndex, style, data }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const { columnCount } = data;
        const index = rowIndex * columnCount + columnIndex;

        if (index >= pages.length) return null;

        const page = pages[index]; // eslint-disable-line security/detect-object-injection
        const isSplitPoint = splitPoints.includes(index);

        // Visual Group Coloring Logic
        const splitCountBefore = splitPoints.filter(p => p < index).length;
        const groupColors = [
            'bg-slate-50', 'bg-indigo-50/30', 'bg-emerald-50/30',
            'bg-amber-50/30', 'bg-rose-50/30', 'bg-cyan-50/30'
        ];
        const groupColor = groupColors[splitCountBefore % groupColors.length];

        // Adjust style for gutter
        const itemStyle = {
            ...style,
            left: Number(style.left) + GUTTER_SIZE,
            top: Number(style.top) + GUTTER_SIZE,
            width: Number(style.width) - GUTTER_SIZE,
            height: Number(style.height) - GUTTER_SIZE,
        };

        return (
            <div style={itemStyle} className="relative group">
                {/* Page Container */}
                <div className={cn(
                    "w-full h-full rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col",
                    groupColor,
                    isSplitPoint ? "border-r-4 border-indigo-500 shadow-xl shadow-indigo-500/10" : "border-slate-200"
                )}>
                    {/* Page Number */}
                    <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-sm border border-slate-200">
                        {page.pageIndex + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="flex-1 p-2 flex items-center justify-center">
                        {page.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={page.imageUrl}
                                alt={`Page ${page.pageIndex + 1}`}
                                className="max-w-full max-h-full object-contain shadow-sm rounded-sm"
                                draggable={false}
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-200/50 animate-pulse rounded-sm" />
                        )}
                    </div>
                </div>

                {/* Scissor Interaction Point */}
                {index < pages.length - 1 && (
                    <button
                        className={cn(
                            "absolute top-1/2 -right-6 w-8 h-8 rounded-full flex items-center justify-center z-50 transition-all transform -translate-y-1/2 shadow-lg border-2 hover:scale-110 active:scale-95",
                            isSplitPoint
                                ? "bg-indigo-600 border-white text-white opacity-100"
                                : "bg-white border-slate-200 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:border-rose-200"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSplit(index);
                        }}
                        title={isSplitPoint ? "Remove Split" : "Split Here"}
                    >
                        <Scissors className="w-4 h-4" />
                    </button>
                )}

                {/* Visual Cut Line */}
                {index < pages.length - 1 && isSplitPoint && (
                    <div className="absolute top-0 bottom-0 -right-[2px] w-[4px] bg-indigo-500/20 z-0 pointer-events-none" />
                )}
            </div>
        );
    };

    return (
        <div className={cn("w-full h-full min-h-[500px] bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden", className)}>
            {/* @ts-expect-error - AutoSizer typing mismatch */}
            <AutoSizer>
                {({ height, width }: { height: number; width: number }) => {
                    // Responsive Column Logic
                    let columnCount = 2;
                    if (width > 640) columnCount = 3;
                    if (width > 768) columnCount = 4;
                    if (width > 1024) columnCount = 5;
                    if (width > 1280) columnCount = 6;

                    const itemWidth = (width - GUTTER_SIZE) / columnCount;
                    const itemHeight = itemWidth * ITEM_HEIGHT_RATIO;
                    const rowCount = Math.ceil(pages.length / columnCount);

                    return (
                        <Grid
                            columnCount={columnCount}
                            columnWidth={itemWidth}
                            height={height}
                            rowCount={rowCount}
                            rowHeight={itemHeight}
                            width={width}
                            itemData={{ columnCount }}
                        >
                            {/* @ts-expect-error: dnd-kit sortable context types - Grid children type mismatch */}
                            {Cell}
                        </Grid>
                    );
                }}
            </AutoSizer>
        </div>
    );
});

