import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// We'll use a simplified schema for now that maps to Fabric objects
export interface FabricObject {
    id: string;
    type: 'text' | 'image' | 'rect' | 'path';
    pageId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    fill?: string;
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    // ... extensive props for Fabric
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface EditStoreState {
    objects: Record<string, FabricObject[]>; // PageID -> Objects[]
    activePageId: string | null;
    selectedObjectIds: Set<string>;
    activeTool: 'select' | 'text' | 'image' | 'rect' | 'draw' | 'hand' | 'edit-text' | 'search' | 'stamp' | 'sign' | 'form' | 'qr' | 'icon' | 'field' | 'redact' | 'calibrate' | 'measure';

    // Actions
    addObject: (pageId: string, object: Partial<FabricObject>) => void;
    updateObject: (pageId: string, objectId: string, updates: Partial<FabricObject>) => void;
    updateSelected: (updates: Partial<FabricObject>) => void;
    removeObject: (pageId: string, objectId: string) => void;
    selectObject: (objectId: string, multi: boolean) => void;
    setActivePage: (pageId: string) => void;
    setActiveTool: (tool: 'select' | 'text' | 'image' | 'rect' | 'draw' | 'hand' | 'edit-text' | 'search' | 'stamp' | 'sign' | 'form' | 'qr' | 'icon' | 'field' | 'redact' | 'calibrate' | 'measure') => void;
    setSelection: (objectIds: string[]) => void;
    reorderObject: (pageId: string, objectId: string, direction: 'front' | 'back' | 'forward' | 'backward') => void;

    // History
    past: Record<string, FabricObject[]>[];
    future: Record<string, FabricObject[]>[];
    undo: () => void;
    redo: () => void;
    takeSnapshot: () => void;
    // Calibration for Construction Mode
    calibration: { scale: number; unit: string } | null; // scale: pixels per unit
    setCalibration: (scale: number, unit: string) => void;
}

export const useEditStore = create<EditStoreState>((set) => ({
    objects: {},
    activePageId: null,
    selectedObjectIds: new Set<string>(),
    activeTool: 'select',
    calibration: null,

    setCalibration: (scale, unit) => set({ calibration: { scale, unit } }),

    addObject: (pageId, object) => set((state) => {
        const newObj = {
            id: object.id || uuidv4(),
            pageId,
            ...object
        } as FabricObject;

        const currentObjects = state.objects[pageId as string] || [];
        return {
            objects: {
                ...state.objects,
                [pageId]: [...currentObjects, newObj]
            }
        };
    }),

    updateObject: (pageId, objectId, updates) => set((state) => {
        const pageObjects = state.objects[pageId as string] || [];
        const newObjects = pageObjects.map(obj =>
            obj.id === objectId ? { ...obj, ...updates } : obj
        );
        const nextObjects = { ...state.objects };
        nextObjects[pageId as string] = newObjects;
        return {
            objects: nextObjects
        };
    }),

    updateSelected: (updates) => set((state) => {
        const { activePageId, selectedObjectIds, objects } = state;
        if (!activePageId || selectedObjectIds.size === 0) return {};

        const pageObjects = objects[activePageId as string] || [];
        const newObjects = pageObjects.map(obj =>
            selectedObjectIds.has(obj.id) ? { ...obj, ...updates } : obj
        );

        const nextObjects = { ...objects };
        nextObjects[activePageId as string] = newObjects;

        return {
            objects: nextObjects
        };
    }),

    removeObject: (pageId, objectId) => set((state) => {
        const pageObjects = state.objects[pageId as string] || [];
        const nextObjects = { ...state.objects };
        nextObjects[pageId as string] = pageObjects.filter(obj => obj.id !== objectId);
        return {
            objects: nextObjects,
            selectedObjectIds: new Set() // clear selection if deleted
        };
    }),

    selectObject: (objectId, multi) => set((state) => {
        const newSet = multi ? new Set(state.selectedObjectIds) : new Set<string>();
        if (state.selectedObjectIds.has(objectId) && multi) {
            newSet.delete(objectId);
        } else {
            newSet.add(objectId);
        }
        return { selectedObjectIds: newSet };
    }),

    setActivePage: (pageId) => set((state) => {
        if (state.activePageId === pageId) return {};
        return { activePageId: pageId };
    }),
    setActiveTool: (tool) => set((state) => {
        if (state.activeTool === tool && state.selectedObjectIds.size === 0) return {};
        return { activeTool: tool, selectedObjectIds: new Set<string>() };
    }),

    setSelection: (objectIds: string[]) => set((state) => {
        // eslint-disable-next-line security/detect-object-injection
        const currentArr = Array.from(state.selectedObjectIds).sort();
        const newArr = [...objectIds].sort();
        if (JSON.stringify(currentArr) === JSON.stringify(newArr)) return {};
        return { selectedObjectIds: new Set(objectIds) };
    }),

    reorderObject: (pageId, objectId, direction) => set((state) => {
        // eslint-disable-next-line security/detect-object-injection
        const pageObjects = [...(state.objects[pageId as string] || [])];
        const index = pageObjects.findIndex(obj => obj.id === objectId);
        if (index === -1) return {};

        const obj = pageObjects.splice(index, 1)[0];
        if (direction === 'front') {
            pageObjects.push(obj);
        } else if (direction === 'back') {
            pageObjects.unshift(obj);
        } else if (direction === 'forward') {
            const nextIndex = Math.min(index + 1, pageObjects.length);
            pageObjects.splice(nextIndex, 0, obj);
        } else if (direction === 'backward') {
            const prevIndex = Math.max(index - 1, 0);
            pageObjects.splice(prevIndex, 0, obj);
        }

        const nextObjects = { ...state.objects };
        // eslint-disable-next-line security/detect-object-injection
        nextObjects[pageId as string] = pageObjects;

        return {
            objects: nextObjects
        };
    }),

    // History stack
    past: [] as Record<string, FabricObject[]>[],
    future: [] as Record<string, FabricObject[]>[],

    undo: () => set((state) => {
        if (state.past.length === 0) return {};

        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, state.past.length - 1);

        return {
            objects: previous,
            past: newPast,
            future: [state.objects, ...state.future]
        };
    }),

    redo: () => set((state) => {
        if (state.future.length === 0) return {};

        const next = state.future[0];
        const newFuture = state.future.slice(1);

        return {
            objects: next,
            past: [...state.past, state.objects],
            future: newFuture
        };
    }),

    takeSnapshot: () => set((state) => ({
        past: [...state.past, JSON.parse(JSON.stringify(state.objects))],
        future: []
    }))
}));
