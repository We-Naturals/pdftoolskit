'use client';

import React, { memo, useCallback, useRef } from 'react';
import { Grid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { useFileStore } from '@/lib/stores/file-store';
import { SortableGridItem } from './SortableGridItem';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';

interface VirtualGridProps {
    className?: string;
}

const GUTTER_SIZE = 16;
const ITEM_HEIGHT_RATIO = 1.4; // Height relative to width (A4ish + padding)

export const VirtualGrid = memo(function VirtualGrid({ className }: VirtualGridProps) {
    const pages = useFileStore((state) => state.pages);
    const toggleSelection = useFileStore((state) => state.toggleSelection);
    const selectRange = useFileStore((state) => state.selectRange);
    const rotatePage = useFileStore((state) => state.rotatePage);
    const movePage = useFileStore((state) => state.movePage);
    const selectedPageIds = useFileStore((state) => state.selectedPageIds);

    const columnCountRef = useRef(1); // Default to 1 column

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
        // Removed TouchSensor as per instruction
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            movePage(active.id as string, over.id as string);
        }
    };

    // Keyboard Navigation Logic
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (selectedPageIds.size === 0) return;

        // Use the last selected item as the anchor for navigation
        const lastId = Array.from(selectedPageIds).pop();
        if (!lastId) return;

        const currentIndex = pages.findIndex(p => p.id === lastId);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        const columnCount = columnCountRef.current;

        if (e.key === 'ArrowRight') {
            nextIndex = Math.min(pages.length - 1, currentIndex + 1);
        } else if (e.key === 'ArrowLeft') {
            nextIndex = Math.max(0, currentIndex - 1);
        } else if (e.key === 'ArrowDown') {
            nextIndex = Math.min(pages.length - 1, currentIndex + columnCount);
        } else if (e.key === 'ArrowUp') {
            nextIndex = Math.max(0, currentIndex - columnCount);
        }

        if (nextIndex !== currentIndex) {
            e.preventDefault();
            // eslint-disable-next-line security/detect-object-injection
            const nextId = pages[nextIndex].id;

            if (e.shiftKey) {
                selectRange(nextId);
            } else {
                toggleSelection(nextId, false); // Exclusive select
            }
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const onSelect = useCallback((id: string, shiftKey: boolean, ctrlKey: boolean) => {
        if (shiftKey) {
            selectRange(id);
        } else {
            // If Ctrl/Meta is held, multi=true.
            // If NOT held, multi=false (exclusive select).
            toggleSelection(id, ctrlKey);
        }
    }, [selectRange, toggleSelection]);

    // Cell Renderer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Cell = useCallback(({ columnIndex, rowIndex, style, data }: any) => {
        // eslint-disable-next-line security/detect-object-injection
        const { columnCount, itemWidth, itemHeight } = data;
        const index = rowIndex * columnCount + columnIndex;

        if (index >= pages.length) return null;

        // eslint-disable-next-line security/detect-object-injection
        const page = pages[index];
        const isSelected = selectedPageIds.has(page.id);

        // Adjust style for gutter
        const itemStyle = {
            ...style,
            left: Number(style.left) + GUTTER_SIZE,
            top: Number(style.top) + GUTTER_SIZE,
            width: Number(style.width) - GUTTER_SIZE,
            height: Number(style.height) - GUTTER_SIZE,
        };

        return (
            <div style={itemStyle}>
                <SortableGridItem
                    page={page}
                    width={itemWidth - GUTTER_SIZE}
                    height={itemHeight - GUTTER_SIZE}
                    isSelected={isSelected}
                    onSelect={({ shiftKey, ctrlKey }) => onSelect(page.id, shiftKey, ctrlKey)}
                    onRotate={(dir) => rotatePage(page.id, dir)}
                />
            </div>
        );
    }, [pages, selectedPageIds, onSelect, rotatePage]);

    return (
        <div
            className={cn("w-full h-full min-h-[500px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden outline-none focus:ring-2 focus:ring-indigo-500/20", className)}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                    {/* @ts-expect-error: items type mismatch */}
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
                                    itemData={{ columnCount, itemWidth, itemHeight }}
                                >
                                    {/* @ts-expect-error: Grid child type mismatch */}
                                    {Cell}
                                </Grid>
                            );
                        }}
                    </AutoSizer>
                </SortableContext>
                {/* DragOverlay could be added here for smoother visuals */}
            </DndContext>
        </div>
    );
});
