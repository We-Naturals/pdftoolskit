/* eslint-disable */
import { aiClient } from './ai-client';
import { SecurityService } from '@/lib/services/security/SecurityService';

export interface SearchResult {
    text: string;
    pageNumber?: number;
    score: number;
}

/**
 * Local Vector Store & Hybrid Search Engine
 * Refactored to use Web Worker via aiClient for performance.
 */
export class VectorStore {
    /**
     * Index a list of text chunks with hash-based caching.
     */
    async indexChunks(chunks: { text: string; pageNumber?: number }[], file: File) {
        // Generate a hash of the file for persistent lookup
        const fileHash = await SecurityService.generateFileHash(file);

        console.log(`[VectorStore] Indexing document with hash: ${fileHash}`);

        const result = await aiClient.indexDocument(fileHash, chunks);

        if (result.cached) {
            console.log('[VectorStore] Successfully restored index from Semantic Cache.');
        } else {
            console.log(`[VectorStore] Indexed ${result.count} chunks in background worker.`);
        }

        return result;
    }

    /**
     * Perform hybrid semantic search via worker.
     */
    async query(text: string, limit: number = 5): Promise<SearchResult[]> {
        return await aiClient.query(text, limit);
    }

    /**
     * Clear the current worker's state if needed.
     * Note: IndexedDB cache remains.
     */
    async clear() {
        // Option to terminate and restart worker for a clean state
        aiClient.terminate();
    }
}

export const vectorStore = new VectorStore();
