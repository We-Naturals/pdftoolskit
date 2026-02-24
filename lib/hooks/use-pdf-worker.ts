import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface WorkerMessage {
    type: 'LOAD_SUCCESS' | 'RENDER_SUCCESS' | 'ERROR';
    id?: string;
    pageNumber?: number;
    bitmap?: ImageBitmap;
    pageCount?: number;
    message?: string;
}

// interface WorkerRequest {
//     type: 'LOAD_DOCUMENT' | 'RENDER_PAGE' | 'UNLOAD_DOCUMENT';
//     id: string; // Document ID
//     file?: ArrayBuffer;
//     url?: string;
//     pageNumber?: number;
//     scale?: number;
//     rotation?: number;
// }

// Singleton worker instance to share across components
let globalWorker: Worker | null = null;
// const activeRequests = new Map<string, (response: unknown) => void>();

const getWorker = () => {
    if (typeof window === 'undefined') return null;

    if (!globalWorker) {
        globalWorker = new Worker(new URL('@/worker/pdf.worker.ts', import.meta.url));
        globalWorker.onmessage = (e: MessageEvent<WorkerMessage>) => {
            const { id } = e.data;
            // Handle request callbacks
            if (id) {
                // ...
            }
        };
    }
    return globalWorker;
};

export function usePDFWorker() {
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        workerRef.current = getWorker();

        const handleMessage = (_e: MessageEvent<WorkerMessage>) => {
            // This hook can subscribe to specific document IDs if needed
        };

        if (workerRef.current) {
            workerRef.current.addEventListener('message', handleMessage);
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.removeEventListener('message', handleMessage);
            }
        };
    }, []);

    const loadDocument = async (file: File): Promise<{ id: string; pageCount: number }> => {
        const worker = getWorker();
        if (!worker) throw new Error('Worker not available');

        const id = uuidv4();
        const arrayBuffer = await file.arrayBuffer();

        return new Promise((resolve, reject) => {
            const handler = (e: MessageEvent<WorkerMessage>) => {
                if (e.data.id === id) {
                    if (e.data.type === 'LOAD_SUCCESS') {
                        worker.removeEventListener('message', handler);
                        resolve({ id, pageCount: e.data.pageCount || 0 });
                    } else if (e.data.type === 'ERROR') {
                        worker.removeEventListener('message', handler);
                        reject(e.data.message);
                    }
                }
            };

            worker.addEventListener('message', handler);
            worker.postMessage({ type: 'LOAD_DOCUMENT', id, file: arrayBuffer }, [arrayBuffer]);
        });
    };

    const renderPage = (docId: string, pageNumber: number, scale: number = 1, rotation: number = 0): Promise<ImageBitmap> => {
        return new Promise((resolve, reject) => {
            const worker = getWorker();
            if (!worker) return reject('Worker not available');

            // Unique key for this render request could be implicitly handled
            // But since the worker is async, we need a way to match the response to this specific promise.
            // Current worker implementation returns 'RENDER_SUCCESS' with id and pageNumber.

            const handler = (e: MessageEvent<WorkerMessage>) => {
                if (e.data.id === docId && e.data.pageNumber === pageNumber && e.data.type === 'RENDER_SUCCESS' && e.data.bitmap) {
                    worker.removeEventListener('message', handler);
                    resolve(e.data.bitmap);
                } else if (e.data.id === docId && e.data.type === 'ERROR') {
                    worker.removeEventListener('message', handler);
                    reject(e.data.message);
                }
            };

            worker.addEventListener('message', handler);
            worker.postMessage({ type: 'RENDER_PAGE', id: docId, pageNumber, scale, rotation });
        });
    };

    return { loadDocument, renderPage };
}
