import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface PDFPage {
    id: string;
    fileId: string;
    pageIndex: number; // 0-based index in the original file
    rotation: number; // 0, 90, 180, 270
    isDeleted: boolean;
    imageUrl?: string;
}

export interface PDFFile {
    id: string;
    file: File;
    name: string;
    pageCount: number;
    size: number;
    summary?: string | string[]; // AI generated 
}

interface FileStoreState {
    files: PDFFile[];
    pages: PDFPage[]; // Flat list of all pages from all files
    selectedPageIds: Set<string>; // For multi-select
    lastSelectedId: string | null; // Anchor for range selection

    // Actions
    addFile: (file: File) => void;
    removeFile: (fileId: string) => void;
    setPageCount: (fileId: string, count: number) => void;
    setSummary: (fileId: string, summary: string | string[]) => void;

    // Page Actions
    rotatePage: (pageId: string, direction: 'cw' | 'ccw') => void;
    rotateAllPages: (direction: 'cw' | 'ccw') => void;
    deletePage: (pageId: string) => void;
    restorePage: (pageId: string) => void;

    // Selection Actions
    toggleSelection: (pageId: string, multi: boolean) => void;
    selectRange: (endId: string) => void;
    selectAll: () => void;
    deselectAll: () => void;

    // Batch Actions on Selection
    rotateSelected: (direction: 'cw' | 'ccw') => void;
    deleteSelected: () => void;

    // Reordering (The "Infinite Desk" Logic)
    movePage: (activeId: string, overId: string) => void;
    reorderPages: (newPages: PDFPage[]) => void;
}

export const useFileStore = create<FileStoreState>((set, _get) => ({
    files: [],
    pages: [],
    selectedPageIds: new Set(),
    lastSelectedId: null,

    addFile: async (file) => {
        const fileId = uuidv4();
        const isImage = file.type.startsWith('image/');

        const newFile: PDFFile = {
            id: fileId,
            file,
            name: file.name,
            pageCount: isImage ? 1 : 0,
            size: file.size,
            summary: isImage ? "Image Asset" : "Generating insight...",
        };

        set((state) => {
            const newState = { files: [...state.files, newFile] };
            if (isImage) {
                const page: PDFPage = {
                    id: uuidv4(),
                    fileId,
                    pageIndex: 0,
                    rotation: 0,
                    isDeleted: false,
                    imageUrl: URL.createObjectURL(file)
                };
                return { ...newState, pages: [...state.pages, page] };
            }
            return newState;
        });

        if (isImage) return;

        // Trigger Async AI Summary for PDFs
        try {
            const { AutoSummaryService } = await import('@/lib/services/ai/AutoSummaryService');
            await AutoSummaryService.initialize();
            const summary = await AutoSummaryService.generateSummary(file);

            set((state) => ({
                files: state.files.map(f => f.id === fileId ? { ...f, summary } : f)
            }));
        } catch (e) {
            console.error("Summary failed", e);
        }
    },

    removeFile: (fileId) => set((state) => ({
        files: state.files.filter(f => f.id !== fileId),
        pages: state.pages.filter(p => p.fileId !== fileId),
        selectedPageIds: new Set(
            Array.from(state.selectedPageIds).filter(id => {
                const page = state.pages.find(p => p.id === id);
                return page && page.fileId !== fileId;
            })
        ),
        lastSelectedId: null
    })),

    setPageCount: (fileId, count) => set((state) => {
        const filePages: PDFPage[] = Array.from({ length: count }, (_, i) => ({
            id: uuidv4(),
            fileId,
            pageIndex: i,
            rotation: 0,
            isDeleted: false
        }));
        // Append new pages to the end
        return {
            files: state.files.map(f => f.id === fileId ? { ...f, pageCount: count } : f),
            pages: [...state.pages, ...filePages]
        };
    }),

    setSummary: (fileId, summary) => set((state) => ({
        files: state.files.map(f => f.id === fileId ? { ...f, summary } : f)
    })),

    rotatePage: (pageId, direction) => set((state) => ({
        pages: state.pages.map(page => {
            if (page.id !== pageId) return page;
            const delta = direction === 'cw' ? 90 : -90;
            let newRot = (page.rotation + delta) % 360;
            if (newRot < 0) newRot += 360;
            return { ...page, rotation: newRot };
        })
    })),

    rotateAllPages: (direction) => set((state) => ({
        pages: state.pages.map(page => {
            const delta = direction === 'cw' ? 90 : -90;
            let newRot = (page.rotation + delta) % 360;
            if (newRot < 0) newRot += 360;
            return { ...page, rotation: newRot };
        })
    })),

    deletePage: (pageId) => set((state) => {
        const newPages = state.pages.map(p => p.id === pageId ? { ...p, isDeleted: true } : p);
        const newSelected = new Set(state.selectedPageIds);
        newSelected.delete(pageId);
        return {
            pages: newPages,
            selectedPageIds: newSelected,
            lastSelectedId: state.lastSelectedId === pageId ? null : state.lastSelectedId
        };
    }),

    restorePage: (pageId) => set((state) => ({
        pages: state.pages.map(p => p.id === pageId ? { ...p, isDeleted: false } : p)
    })),

    toggleSelection: (pageId, multi) => set((state) => {
        // Exclusive Logic (Click)
        if (!multi) {
            const newSet = new Set([pageId]);
            return { selectedPageIds: newSet, lastSelectedId: pageId };
        }

        // Multi Logic (Ctrl+Click)
        const newSet = new Set(state.selectedPageIds);
        if (newSet.has(pageId)) {
            newSet.delete(pageId);
        } else {
            newSet.add(pageId);
        }
        return { selectedPageIds: newSet, lastSelectedId: pageId };
    }),

    selectRange: (endId) => set((state) => {
        const { lastSelectedId, pages } = state;

        // If no anchor, treat as single select
        if (!lastSelectedId) {
            return { selectedPageIds: new Set([endId]), lastSelectedId: endId };
        }

        const startIndex = pages.findIndex(p => p.id === lastSelectedId);
        const endIndex = pages.findIndex(p => p.id === endId);

        if (startIndex === -1 || endIndex === -1) return {};

        const min = Math.min(startIndex, endIndex);
        const max = Math.max(startIndex, endIndex);

        // Standard behavior: Start with existing selection?
        // Usually Shift+Click modifies the selection to be the range from Anchor to Target.
        // It often CLEARS other non-related selections unless Ctrl is also held, but let's keep it additive for now as it's safer.
        const newSet = new Set(state.selectedPageIds); // Additive
        const currentPages = [...pages];
        for (let i = min; i <= max; i++) {
            newSet.add(currentPages[i as number].id);
        }
        return { selectedPageIds: newSet, lastSelectedId: endId };
    }),

    selectAll: () => set((state) => ({
        selectedPageIds: new Set(state.pages.map(p => p.id))
    })),

    deselectAll: () => set({ selectedPageIds: new Set() }),

    rotateSelected: (direction) => set((state) => {
        if (state.selectedPageIds.size === 0) return {};

        return {
            pages: state.pages.map(page => {
                if (!state.selectedPageIds.has(page.id)) return page;

                const delta = direction === 'cw' ? 90 : -90;
                let newRot = (page.rotation + delta) % 360;
                if (newRot < 0) newRot += 360;
                return { ...page, rotation: newRot };
            })
        };
    }),

    deleteSelected: () => set((state) => {
        if (state.selectedPageIds.size === 0) return {};

        const newPages = state.pages.map(p =>
            state.selectedPageIds.has(p.id) ? { ...p, isDeleted: true } : p
        );

        return {
            pages: newPages,
            selectedPageIds: new Set(), // Clear selection after delete
            lastSelectedId: null
        };
    }),

    movePage: (activeId, overId) => set((state) => {
        const oldIndex = state.pages.findIndex(p => p.id === activeId);
        const newIndex = state.pages.findIndex(p => p.id === overId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return {};

        const newPages = [...state.pages];
        const [movedPage] = newPages.splice(oldIndex, 1);
        newPages.splice(newIndex, 0, movedPage);

        return { pages: newPages };
    }),

    reorderPages: (newPages) => set({ pages: newPages })
}));
