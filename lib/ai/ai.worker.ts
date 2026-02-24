/* eslint-disable */
import { expose } from 'comlink';
import { create, insert, search, save, load } from '@orama/orama';
import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';
import { openDB, type IDBPDatabase } from 'idb';

// We'll use a specific version for the DB
const DB_NAME = 'pdftools-ai-cache';
const STORE_NAME = 'vector-indexes';

class AIWorker {
    private db: any = null;
    private embedder: FeatureExtractionPipeline | null = null;
    private indexedDb: IDBPDatabase | null = null;
    private readonly MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

    async init() {
        if (!this.indexedDb) {
            this.indexedDb = await openDB(DB_NAME, 1, {
                upgrade(db) {
                    db.createObjectStore(STORE_NAME);
                },
            });
        }

        if (!this.embedder) {
            this.embedder = await pipeline('feature-extraction', this.MODEL_NAME);
        }
    }

    async getEmbedding(text: string): Promise<number[]> {
        if (!this.embedder) await this.init();
        const output = await this.embedder!(text, {
            pooling: 'mean',
            normalize: true
        });
        return Array.from(output.data);
    }

    async indexDocument(fileHash: string, chunks: { text: string; pageNumber?: number }[]) {
        await this.init();

        // Create instance with schema first
        this.db = await create({
            schema: {
                text: 'string',
                pageNumber: 'number',
                embedding: 'vector[384]',
            }
        });

        // Check cache first
        const cached = await this.indexedDb?.get(STORE_NAME, fileHash);
        if (cached) {
            await load(this.db, cached);
            return { cached: true };
        }

        // Batch processing
        const entries = await Promise.all(chunks.map(async (chunk) => {
            const embedding = await this.getEmbedding(chunk.text);
            return {
                text: chunk.text,
                pageNumber: chunk.pageNumber,
                embedding
            };
        }));

        for (const entry of entries) {
            await insert(this.db, entry);
        }

        // Save to cache
        const snapshot = await save(this.db);
        await this.indexedDb?.put(STORE_NAME, snapshot, fileHash);

        return { cached: false, count: entries.length };
    }

    async query(text: string, limit: number = 5) {
        if (!this.db) return [];

        const queryEmbedding = await this.getEmbedding(text);
        const results = await search(this.db, {
            mode: 'vector',
            vector: {
                value: queryEmbedding,
                property: 'embedding',
            },
            limit,
            similarity: 0.15,
        });

        return results.hits.map(hit => ({
            text: hit.document.text as string,
            pageNumber: hit.document.pageNumber as number,
            score: hit.score
        }));
    }

    // We can also add MLC-AI logic here if needed, 
    // but for now let's focus on RAG and Embeddings which are the most frequent main-thread blockers.
}

expose(new AIWorker());
