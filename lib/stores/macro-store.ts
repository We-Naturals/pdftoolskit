
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActionType = 'ROTATE' | 'SPLIT' | 'MERGE' | 'OCR' | 'CONVERT';

export interface MacroAction {
    id: string;
    type: ActionType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: Record<string, any>;
    timestamp: number;
    description: string;
}

export interface Workflow {
    id: string;
    name: string;
    actions: MacroAction[];
    createdAt: number;
}

interface MacroStore {
    isRecording: boolean;
    currentWorkflow: MacroAction[];
    savedWorkflows: Workflow[];

    startRecording: () => void;
    stopRecording: (name: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recordAction: (type: ActionType, params: Record<string, any>, description?: string) => void;
    deleteWorkflow: (id: string) => void;
    clearCurrent: () => void;
}

export const useMacroStore = create<MacroStore>()(
    persist(
        (set, get) => ({
            isRecording: false,
            currentWorkflow: [],
            savedWorkflows: [],

            startRecording: () => set({ isRecording: true, currentWorkflow: [] }),

            stopRecording: (name) => {
                const { currentWorkflow, savedWorkflows } = get();
                if (currentWorkflow.length === 0) {
                    set({ isRecording: false });
                    return;
                }

                const newWorkflow: Workflow = {
                    id: crypto.randomUUID(),
                    name,
                    actions: [...currentWorkflow],
                    createdAt: Date.now()
                };

                set({
                    isRecording: false,
                    savedWorkflows: [...savedWorkflows, newWorkflow],
                    currentWorkflow: []
                });
            },

            recordAction: (type, params, description) => {
                const { isRecording, currentWorkflow } = get();
                if (!isRecording) return;

                const newAction: MacroAction = {
                    id: crypto.randomUUID(),
                    type,
                    params,
                    timestamp: Date.now(),
                    description: description || `Action: ${type}`
                };

                set({ currentWorkflow: [...currentWorkflow, newAction] });
            },

            deleteWorkflow: (id) => {
                set({ savedWorkflows: get().savedWorkflows.filter(w => w.id !== id) });
            },

            clearCurrent: () => set({ currentWorkflow: [] })
        }),
        {
            name: 'macro-storage'
        }
    )
);
