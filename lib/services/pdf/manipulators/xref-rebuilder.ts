
/**
 * XRefRebuilder: A low-level utility to manual reconstruct PDF Cross-Reference tables.
 * This is used when standard PDF parsers fail due to fractured internal structures.
 */

export interface XRefEntry {
    id: number;
    generation: number;
    offset: number;
    inUse: boolean;
}

export class XRefRebuilder {
    /**
     * Manually scans a PDF buffer for object markers and rebuilds the XRef table.
     */
    public static async rebuild(buffer: ArrayBuffer): Promise<ArrayBuffer> {
        const bytes = new Uint8Array(buffer);
        const entries: XRefEntry[] = [];

        // 1. Scan for "X Y obj" pattern
        // Regex for objects: /(\d+)\s+(\d+)\s+obj/g
        const content = new TextDecoder().decode(bytes.slice(0, 10 * 1024 * 1024)); // Scan first 10MB for objects
        const objRegex = /(\d+)\s+(\d+)\s+obj/g;
        let match;

        while ((match = objRegex.exec(content)) !== null) {
            entries.push({
                id: parseInt(match[1]),
                generation: parseInt(match[2]),
                offset: match.index,
                inUse: true
            });
        }

        if (entries.length === 0) {
            throw new Error('No objects found during manual scan');
        }

        // 2. Sort by ID
        entries.sort((a, b) => a.id - b.id);

        // 3. Find highest ID
        const maxId = entries[entries.length - 1].id;

        // 4. Construct a new XRef table string
        let xrefString = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;

        const entryMap = new Map(entries.map(e => [e.id, e]));

        for (let i = 1; i <= maxId; i++) {
            const entry = entryMap.get(i);
            if (entry) {
                xrefString += `${entry.offset.toString().padStart(10, '0')} ${entry.generation.toString().padStart(5, '0')} n \n`;
            } else {
                xrefString += `0000000000 65535 f \n`;
            }
        }

        // 5. Append trailer
        // This is a minimal trailer, pdf-lib should be able to fix the rest if we get it loaded
        xrefString += `trailer\n<< /Size ${maxId + 1} >>\nstartxref\n${bytes.byteLength}\n%%EOF`;

        const xrefBytes = new TextEncoder().encode(xrefString);
        const newBuffer = new Uint8Array(bytes.byteLength + xrefBytes.byteLength);
        newBuffer.set(bytes);
        newBuffer.set(xrefBytes, bytes.byteLength);

        return newBuffer.buffer;
    }
}
