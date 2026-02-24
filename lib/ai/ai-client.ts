/* eslint-disable */
import * as Comlink from 'comlink';

export interface AIWorkerAPI {
    init(): Promise<void>;
    getEmbedding(text: string): Promise<number[]>;
    indexDocument(fileHash: string, chunks: { text: string; pageNumber?: number }[]): Promise<{ cached: boolean; count?: number }>;
    query(text: string, limit?: number): Promise<any[]>;
}

class AIClient {
    private worker: Worker | null = null;
    private api: Comlink.Remote<AIWorkerAPI> | null = null;

    private getWorker() {
        if (!this.worker) {
            this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), {
                type: 'module'
            });
            this.api = Comlink.wrap<AIWorkerAPI>(this.worker);
        }
        return this.api!;
    }

    async indexDocument(fileHash: string, chunks: { text: string; pageNumber?: number }[]) {
        return await this.getWorker().indexDocument(fileHash, chunks);
    }

    async query(text: string, limit: number = 5) {
        return await this.getWorker().query(text, limit);
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.api = null;
        }
    }
}

export const aiClient = new AIClient();
