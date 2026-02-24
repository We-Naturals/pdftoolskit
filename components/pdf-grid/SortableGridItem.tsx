import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GridItem } from './GridItem';
import { PDFPage } from '@/lib/stores/file-store';
import { cn } from '@/lib/utils';

interface SortableGridItemProps {
    page: PDFPage;
    width: number;
    height: number;
    isSelected: boolean;
    onSelect: (modifiers: { shiftKey: boolean; ctrlKey: boolean }) => void;
    onRotate: (direction: 'cw' | 'ccw') => void;
}

export function SortableGridItem(props: SortableGridItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.page.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "touch-none", // Prevent scrolling on touch while dragging
                isDragging && "cursor-grabbing"
            )}
        >
            <GridItem {...props} />
        </div>
    );
}
