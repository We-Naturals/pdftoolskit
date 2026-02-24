/**
 * PHASE 52.2: THE APEX WASM MEMORY POOL
 * This pool manages large ArrayBuffer allocations (>10MB) to prevent 
 * V8 heap fragmentation and repetitive GC cycles during batch conversion.
 */

class WasmPool {
    private heap: Map<string, ArrayBuffer> = new Map();
    private accessTime: Map<string, number> = new Map();
    private currentSize: number = 0;
    private readonly MAX_POOL_SIZE = 256 * 1024 * 1024; // 256MB Cap

    /**
     * Retrieves or creates a buffer of exactly the required size.
     */
    public acquire(size: number, id: string): ArrayBuffer {
        if (this.heap.has(id)) {
            const buffer = this.heap.get(id)!;
            if (buffer.byteLength >= size) {
                this.accessTime.set(id, Date.now());
                return buffer;
            }
        }

        // Check if we need to evict
        while (this.currentSize + size > this.MAX_POOL_SIZE) {
            this.evictLRU();
        }

        const buffer = new ArrayBuffer(size);
        this.heap.set(id, buffer);
        this.accessTime.set(id, Date.now());
        this.currentSize += size;
        return buffer;
    }

    private evictLRU() {
        let oldestId = '';
        let oldestTime = Date.now();
        for (const [id, time] of this.accessTime.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestId = id;
            }
        }
        if (oldestId) {
            const buffer = this.heap.get(oldestId);
            if (buffer) this.currentSize -= buffer.byteLength;
            this.heap.delete(oldestId);
            this.accessTime.delete(oldestId);
        }
    }

    public getStats() {
        return {
            poolBytes: this.currentSize,
            entries: this.heap.size
        };
    }
}

export const wasmMemoryPool = new WasmPool();
