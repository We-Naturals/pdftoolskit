/* eslint-disable */
import { OCRZone, OCRBlock } from '../analysis/ocr-layout-analyzer';

export interface ReflowNode {
    type: 'h1' | 'h2' | 'p' | 'table' | 'img' | 'list';
    content: string | any;
    pageNumber: number;
    metadata?: Record<string, any>;
}

export interface ReflowTree {
    title?: string;
    sections: ReflowNode[];
}

/**
 * Semantic Reflow Engine
 * Virtualizes static OCR coordinates into a fluid structural tree.
 */
export class ReflowEngine {
    /**
     * Map raw OCR zones into a structural virtual tree.
     */
    virtualize(pages: { zones: OCRZone[], pageNumber: number }[]): ReflowTree {
        const sections: ReflowNode[] = [];

        for (const page of pages) {
            for (const zone of page.zones) {
                if (zone.type === 'header') {
                    sections.push({
                        type: 'h2',
                        content: zone.blocks.map(b => b.text).join(' '),
                        pageNumber: page.pageNumber
                    });
                } else if (zone.type === 'column' || zone.type === 'generic') {
                    // Check for tables
                    if (this.isTabular(zone)) {
                        sections.push({
                            type: 'table',
                            content: this.getTabularData(zone),
                            pageNumber: page.pageNumber
                        });
                    } else {
                        // Group blocks into paragraphs based on spacing
                        const paragraphs = this.groupIntoParagraphs(zone.blocks);
                        for (const p of paragraphs) {
                            sections.push({
                                type: 'p',
                                content: p,
                                pageNumber: page.pageNumber
                            });
                        }
                    }
                } else if (zone.type === 'footer') {
                    // Often irrelevant for reflow, but we can keep it as small text
                    sections.push({
                        type: 'p',
                        content: zone.blocks.map(b => b.text).join(' '),
                        pageNumber: page.pageNumber,
                        metadata: { isFooter: true }
                    });
                }
            }
        }

        return { sections };
    }

    private groupIntoParagraphs(blocks: OCRBlock[]): string[] {
        if (blocks.length === 0) return [];
        const paragraphs: string[] = [];
        let currentPara = '';
        let lastY = blocks[0].y;
        let lastHeight = blocks[0].height;

        for (const block of blocks) {
            // If the jump in Y is significantly larger than the line height, it's a new paragraph
            const yGap = block.y - (lastY + lastHeight);
            if (yGap > lastHeight * 1.5 && currentPara.length > 0) {
                paragraphs.push(currentPara.trim());
                currentPara = block.text;
            } else {
                currentPara += (currentPara.length > 0 ? ' ' : '') + block.text;
            }
            lastY = block.y;
            lastHeight = block.height;
        }

        if (currentPara) paragraphs.push(currentPara.trim());
        return paragraphs;
    }

    private isTabular(zone: OCRZone): boolean {
        const rowCount = new Set(zone.blocks.map(b => Math.round(b.y / 15))).size;
        return zone.blocks.length > rowCount * 1.8;
    }

    private getTabularData(zone: OCRZone): string[][] {
        const threshold = 15;
        const rows: OCRBlock[][] = [];
        let currentRow: OCRBlock[] = [];

        const sorted = [...zone.blocks].sort((a, b) => (a.y - b.y) || (a.x - b.x));

        for (const block of sorted) {
            if (currentRow.length === 0 || Math.abs(currentRow[0].y - block.y) < threshold) {
                currentRow.push(block);
            } else {
                rows.push([...currentRow].sort((a, b) => a.x - b.x));
                currentRow = [block];
            }
        }
        if (currentRow.length > 0) rows.push([...currentRow].sort((a, b) => a.x - b.x));

        return rows.map(row => row.map(b => b.text.trim().replace(/\n/g, ' ')));
    }
}

export const reflowEngine = new ReflowEngine();
