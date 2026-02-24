/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WorkerPool.ts
 * High-performance task distribution engine for PDF operations.
 */

type TaskType = 'ORGANIZE_PDF' | 'REPAIR_PDF' | 'COMPRESS_PDF' | 'EXCEL_TO_PDF' | 'WORD_TO_PDF' | 'IMAGE_TO_PDF' | 'ADD_PAGE_NUMBERS' | 'ADD_WATERMARK' | 'PROTECT_PDF' | 'UNLOCK_PDF' | 'SPLIT_PDF' | 'BATES_STAMP'
    | 'MAIL_MERGE'
    | 'PPT_TO_PDF'
    | 'PDF_TO_IMAGE'
    | 'SIGN_PDF'
    | 'REDACT_PDF'
    | 'RENDER_PAGE'
    | 'SCAN_TO_PDF'
    | 'EDIT_PDF'
    | 'PDF_TO_WORD'
    | 'OCR_PDF'
    | 'BIO_ENCODE'
    | 'ANALYZE_SECURITY'
    | 'EXTRACT_TEXT'
    | 'APPLY_FILTER'
    | 'DIFF_PAGES'
    | 'PDF_TO_EXCEL'
    | 'PDF_TO_PPTX'
    | 'EDIT_METADATA'
    | 'STRIP_METADATA'
    | 'GET_METADATA'
    | 'FLATTEN_PDF'
    | 'CROP_PDF'
    | 'CONVERT_PDFA'
    | 'PRINT_READY_PDF'
    | 'WORKFLOW_EXECUTE'
    | 'ANALYZE_PAGES';

interface Task {
    id: string;
    type: TaskType;
    payload: any;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
}

class WorkerPool {
    private workers: Worker[] = [];
    private queue: Task[] = [];
    private activeWorkers = new Map<Worker, boolean>();
    private maxWorkers: number;

    constructor(maxWorkers = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4) {
        this.maxWorkers = maxWorkers;
    }

    private createWorker(): Worker {
        const worker = new Worker(new URL('../../worker/processing.worker.ts', import.meta.url), {
            type: 'module'
        });

        worker.onmessage = (e) => {
            const { id } = e.data;
            if (id) {
                // Signal worker availability
                this.activeWorkers.set(worker, false);
                this.processNext();
            }
        };

        return worker;
    }

    async runTask<T>(type: TaskType, payload: any): Promise<T> {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(7);
            const task: Task = { id, type, payload, resolve, reject };
            this.queue.push(task);
            this.processNext();
        });
    }

    /**
     * PHASE 36.1: Multi-Threaded Chunking
     * Splits a monolithic task into sub-tasks and executes them in parallel across the pool.
     */
    async runChunkedTask<T>(type: TaskType, chunks: any[]): Promise<T[]> {
        const results = await Promise.all(chunks.map(chunk => this.runTask<T>(type, chunk)));
        return results;
    }

    private processNext() {
        if (this.queue.length === 0) return;

        let availableWorker = Array.from(this.activeWorkers.entries()).find(([, active]) => !active)?.[0];

        if (!availableWorker && this.workers.length < this.maxWorkers) {
            availableWorker = this.createWorker();
            this.workers.push(availableWorker);
        }

        if (availableWorker) {
            const task = this.queue.shift()!;
            this.activeWorkers.set(availableWorker, true);

            // Determine Transferables for performance
            const transferables: Transferable[] = [];
            if (task.payload && task.payload.fileData instanceof ArrayBuffer) {
                // Only transfer if NOT a SharedArrayBuffer
                if (!(task.payload.fileData instanceof (globalThis as any).SharedArrayBuffer)) {
                    transferables.push(task.payload.fileData);
                }
            }

            // Setup temporary listener for this specific task
            const handler = (e: MessageEvent) => {
                const { type: resType, id: resId, result, message } = e.data;
                if (resId === task.id) {
                    availableWorker!.removeEventListener('message', handler);
                    if (resType === 'SUCCESS') {
                        task.resolve(result);
                    } else {
                        task.reject(new Error(message));
                    }
                    this.activeWorkers.set(availableWorker!, false);
                    this.processNext();
                }
            };

            availableWorker.addEventListener('message', handler);
            availableWorker.postMessage({ type: task.type, id: task.id, payload: task.payload }, transferables);
        }
    }
}

export const globalWorkerPool = new WorkerPool();
