/* eslint-disable */
import { diff_match_patch } from 'diff-match-patch';

export interface TextItem {
    str: string;
    dir: string;
    width: number;
    height: number;
    transform: number[]; // [v0...v5] where v4, v5 are x, y
    fontName: string;
}

export interface DiffHighlight {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'add' | 'delete';
}

/**
 * Structural Diff Engine for PDF God Mode
 * Extracts text layers and performs semantic comparison.
 */
export class PDFDiffEngine {
    private dmp: InstanceType<typeof diff_match_patch>;

    constructor() {
        this.dmp = new diff_match_patch();
    }

    /**
     * Compares two PDF pages and returns a set of highlight regions for changes.
     */
    async comparePages(pageA: any, pageB: any): Promise<{ highlightsA: DiffHighlight[], highlightsB: DiffHighlight[] }> {
        const [contentA, contentB] = await Promise.all([
            pageA.getTextContent(),
            pageB.getTextContent()
        ]);

        const itemsA = contentA.items as any[];
        const itemsB = contentB.items as any[];

        const fullTextA = itemsA.map(i => i.str).join('\n');
        const fullTextB = itemsB.map(i => i.str).join('\n');

        const diffs = this.dmp.diff_main(fullTextA, fullTextB);
        this.dmp.diff_cleanupSemantic(diffs);

        const highlightsA: DiffHighlight[] = [];
        const highlightsB: DiffHighlight[] = [];

        // Simple mapping: find items that contain the changed text
        // Note: Real "God Mode" would use character-level coordinate math
        // but text-item-level is a robust starting point for professional UX.

        diffs.forEach(([type, text]: [number, string]) => {
            if (type === -1) { // Deletion (Present in A, not B)
                this.mapTextToHighlights(text, itemsA, 'delete', highlightsA);
            } else if (type === 1) { // Addition (Present in B, not A)
                this.mapTextToHighlights(text, itemsB, 'add', highlightsB);
            }
        });

        return { highlightsA, highlightsB };
    }

    private mapTextToHighlights(diffText: string, items: any[], type: 'add' | 'delete', highlights: DiffHighlight[]) {
        const searchLines = diffText.split('\n').filter(l => l.trim().length > 0);

        searchLines.forEach(line => {
            items.forEach(item => {
                if (item.str.includes(line) && item.str.trim().length > 0) {
                    const [_a, _b, _c, _d, x, y] = item.transform;
                    // Bounding Box (Note: y in PDF is usually from bottom, 
                    // we'll handle coordinate normalization in visual layer if needed)
                    highlights.push({
                        x,
                        y: y - item.height, // Approximate top-down
                        width: item.width,
                        height: item.height,
                        type
                    });
                }
            });
        });
    }
}
