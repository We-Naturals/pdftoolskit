
import { create } from 'zustand';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { FabricObject } from './edit-store';

interface CollaborationState {
    doc: Y.Doc;
    provider: WebrtcProvider | null;
    users: Map<string, unknown>;
    awareness: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    peers: unknown[];
    isConnected: boolean;

    // Actions
    connect: (roomId: string) => void;
    disconnect: () => void;
    updateObject: (obj: FabricObject) => void;
    broadcastCursor: (x: number, y: number, userId: string, color: string) => void;
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
    doc: new Y.Doc(),
    provider: null,
    users: new Map(),
    awareness: null,
    peers: [],
    isConnected: false,

    connect: (roomId: string) => {
        const { doc, provider } = get();
        if (provider) return;

        // console.log('Connecting to Yjs Room:', roomId);

        // Connect to public signaling servers for demo purposes
        // In production, you'd host your own or use a paid service
        const newProvider = new WebrtcProvider(roomId, doc, {
            signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com', 'wss://y-webrtc-signaling-us.herokuapp.com']
        });

        const awareness = newProvider.awareness;

        // Track peers
        awareness.on('change', () => {
            const peers = Array.from(awareness.getStates().values());
            set({ peers });
        });

        set({
            provider: newProvider,
            awareness,
            isConnected: true
        });
    },

    disconnect: () => {
        const { provider } = get();
        if (provider) {
            provider.destroy();
            set({ provider: null, isConnected: false, peers: [] });
        }
    },

    updateObject: (obj: FabricObject) => {
        const { doc } = get();
        const yMap = doc.getMap('objects');
        yMap.set(obj.id, obj);
    },

    broadcastCursor: (x, y, userId, color) => {
        const { awareness } = get();
        if (awareness) {
            awareness.setLocalStateField('cursor', { x, y, userId, color });
        }
    }
}));
