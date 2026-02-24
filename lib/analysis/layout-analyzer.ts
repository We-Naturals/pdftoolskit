import { pdfjsLib } from '../utils/pdf-init';

export interface TextBlock {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontName: string;
    isHeading: boolean;
}

export interface LayoutAnalysis {
    blocks: TextBlock[];
    pages: {
        width: number;
        height: number;
        blocks: TextBlock[];
    }[];
}

/**
 * Intelligent Layout Analyzer for PDF Reconstruction.
 * This service maps raw PDF text elements into logical structural blocks.
 */
export class LayoutAnalyzer {
    async analyze(file: File | Blob): Promise<LayoutAnalysis> {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const analysis: LayoutAnalysis = { blocks: [], pages: [] };

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1 });

            const pageBlocks: TextBlock[] = this.groupInLogicalBlocks((textContent.items as any[])); // eslint-disable-line @typescript-eslint/no-explicit-any

            analysis.pages.push({
                width: viewport.width,
                height: viewport.height,
                blocks: pageBlocks
            });

            analysis.blocks.push(...pageBlocks);
        }

        return analysis;
    }

    private groupInLogicalBlocks(items: any[]): TextBlock[] { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (items.length === 0) return [];

        // 1. Sort by Y (top to bottom) then X (left to right)
        // PDF.js coordinates: Y is usually from bottom (0) to top (height)
        const sortedItems = [...items].sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 5) return yDiff;
            return a.transform[4] - b.transform[4];
        });

        const blocks: TextBlock[] = [];
        let currentBlock: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

        for (const item of sortedItems) {
            const x = item.transform[4];
            const y = item.transform[5];
            const h = item.height || item.transform[0]; // Simplified font size estimation

            if (!currentBlock) {
                currentBlock = this.createNewBlock(item);
            } else {
                const yDist = Math.abs(currentBlock.y - y);
                const xDist = Math.abs(currentBlock.x - x);

                // Heuristic: If it's on the same line or very close vertically
                if (yDist < h * 1.5 && xDist < 100) {
                    currentBlock.text += (xDist > 5 ? ' ' : '') + item.str;
                    currentBlock.width = Math.max(currentBlock.width, x + item.width - currentBlock.x);
                } else {
                    blocks.push(currentBlock);
                    currentBlock = this.createNewBlock(item);
                }
            }
        }

        if (currentBlock) blocks.push(currentBlock);

        return blocks;
    }

    private static async detectColumns(pageText: string): Promise<number> {
        // Logic to detect multi-column layout based on white space and text distribution
        // Placeholder implementation
        return pageText.includes("    ") ? 2 : 1;
    }

    private static async getPageTextContent(_pdfPage: pdfjsLib.PDFPageProxy): Promise<string> {
        // Simplified extraction for God Mode demo
        // In a real app, this would use pdf.js to extract text positions
        return _pdfPage.toString() || "";
    }

    private createNewBlock(item: any): TextBlock { // eslint-disable-line @typescript-eslint/no-explicit-any
        const x = item.transform[4];
        const y = item.transform[5];
        const h = item.height || Math.abs(item.transform[0]);

        return {
            text: item.str,
            x,
            y,
            width: item.width,
            height: h,
            fontSize: h,
            fontName: item.fontName,
            isHeading: h > 14, // Simple heuristic for headings
        };
    }
}

export const layoutAnalyzer = new LayoutAnalyzer();
