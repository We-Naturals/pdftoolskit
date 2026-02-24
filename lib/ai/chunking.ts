
/**
 * Smart Text Chunking for RAG
 * Ensures context is preserved by splitting on paragraph boundaries and
 * maintaining overlap for continuity.
 */
export interface Chunk {
    text: string;
    startIndex: number;
    endIndex: number;
    pageNumber?: number;
}

export interface ChunkingOptions {
    chunkSize?: number;
    chunkOverlap?: number;
}

export function chunkText(text: string, options: ChunkingOptions = {}): Chunk[] {
    const { chunkSize = 1000, chunkOverlap = 200 } = options;

    // 1. Normalize whitespace and split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: Chunk[] = [];

    let currentChunk = '';
    let currentStart = 0;

    for (const para of paragraphs) {
        const cleanPara = para.trim();
        if (!cleanPara) continue;

        // If a single paragraph is larger than chunk size, we must split it by sentences
        if (cleanPara.length > chunkSize) {
            const sentences = cleanPara.match(/[^.!?]+[.!?]+/g) || [cleanPara];

            for (const sentence of sentences) {
                if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
                    chunks.push({
                        text: currentChunk,
                        startIndex: currentStart,
                        endIndex: currentStart + currentChunk.length
                    });

                    // Maintain overlap
                    const lastSnippet = currentChunk.slice(-chunkOverlap);
                    currentChunk = lastSnippet + ' ' + sentence;
                    currentStart += currentChunk.length - lastSnippet.length;
                } else {
                    currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
                }
            }
        } else {
            // Check if adding this paragraph exceeds chunk size
            if ((currentChunk + cleanPara).length > chunkSize && currentChunk.length > 0) {
                chunks.push({
                    text: currentChunk,
                    startIndex: currentStart,
                    endIndex: currentStart + currentChunk.length
                });

                // Maintain overlap
                const lastSnippet = currentChunk.slice(-chunkOverlap);
                currentChunk = lastSnippet + '\n\n' + cleanPara;
                currentStart += currentChunk.length - lastSnippet.length;
            } else {
                currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + cleanPara;
            }
        }
    }

    // Push final chunk
    if (currentChunk.trim()) {
        chunks.push({
            text: currentChunk,
            startIndex: currentStart,
            endIndex: currentStart + currentChunk.length
        });
    }

    return chunks;
}
