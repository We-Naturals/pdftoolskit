/* eslint-disable */
export interface OCRBlock {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
}

export interface OCRZone {
    type: 'header' | 'footer' | 'column' | 'generic';
    blocks: OCRBlock[];
    bounds: { x: number, y: number, w: number, h: number };
}

/**
 * Advanced Geometric Zone Tracker for OCR.
 * Implements Phase 17: Structural Intelligence.
 */
export class OcrLayoutAnalyzer {
    analyze(blocks: OCRBlock[], pageWidth: number, pageHeight: number): OCRZone[] {
        if (blocks.length === 0) return [];

        const headerThreshold = pageHeight * 0.12; // Top 12%
        const footerThreshold = pageHeight * 0.88; // Bottom 12%

        const headerBlocks: OCRBlock[] = [];
        const footerBlocks: OCRBlock[] = [];
        const contentBlocks: OCRBlock[] = [];

        // 1. Initial Vertical Pass (Header/Footer Detection)
        for (const block of blocks) {
            if (block.y < headerThreshold) {
                headerBlocks.push(block);
            } else if (block.y > footerThreshold) {
                footerBlocks.push(block);
            } else {
                contentBlocks.push(block);
            }
        }

        const zones: OCRZone[] = [];

        if (headerBlocks.length > 0) {
            zones.push(this.createZone('header', headerBlocks));
        }

        // 2. Horizontal Pass (Column & Table Detection)
        const contentZones = this.detectStructuralZones(contentBlocks, pageWidth);
        zones.push(...contentZones);

        if (footerBlocks.length > 0) {
            zones.push(this.createZone('footer', footerBlocks));
        }

        return zones;
    }

    private detectStructuralZones(blocks: OCRBlock[], pageWidth: number): OCRZone[] {
        if (blocks.length === 0) return [];

        // Sort by Y then X
        const sorted = [...blocks].sort((a, b) => (a.y - b.y) || (a.x - b.x));

        // Find potential table clusters
        const tableCandidateBlocks = this.findTableCandidates(sorted);
        const nonTableBlocks = blocks.filter(b => !tableCandidateBlocks.includes(b));

        const zones: OCRZone[] = [];

        if (tableCandidateBlocks.length > 0) {
            zones.push(this.createZone('generic', tableCandidateBlocks)); // We'll refine this to 'table' later in reconstruct
        }

        if (nonTableBlocks.length > 0) {
            // Further divide non-table blocks into columns
            zones.push(...this.detectColumns(nonTableBlocks, pageWidth));
        }

        return zones.sort((a, b) => a.bounds.y - b.bounds.y);
    }

    private findTableCandidates(blocks: OCRBlock[]): OCRBlock[] {
        // Simple heuristic: if blocks have similar Y but distinct X, they might be table cells
        const threshold = 10;
        const rows: OCRBlock[][] = [];
        let currentRow: OCRBlock[] = [];

        for (const block of blocks) {
            if (currentRow.length === 0 || Math.abs(currentRow[0].y - block.y) < threshold) {
                currentRow.push(block);
            } else {
                rows.push(currentRow);
                currentRow = [block];
            }
        }
        if (currentRow.length > 0) rows.push(currentRow);

        // A table candidate is a row with many gaps, or consecutive rows with similar column starts
        const tableBlocks: OCRBlock[] = [];
        for (const row of rows) {
            if (row.length > 2) { // 3 or more segments in a row is highly likely a table
                tableBlocks.push(...row);
            }
        }
        return tableBlocks;
    }

    private detectColumns(blocks: OCRBlock[], pageWidth: number): OCRZone[] {
        if (blocks.length === 0) return [];

        // Sort by X to find clusters
        const _sortedByX = [...blocks].sort((a, b) => a.x - b.x);

        // Find "Gaps" in X-coordinates that might indicate columns
        const _columnGaps: number[] = [];
        const midPoint = pageWidth / 2;

        // Heuristic: Check if there's a significant empty space around the vertical center
        const centerGutterWidth = pageWidth * 0.05; // 5% gutter
        const leftHalfBlocks = blocks.filter(b => (b.x + b.width) < (midPoint + centerGutterWidth / 2));
        const rightHalfBlocks = blocks.filter(b => b.x > (midPoint - centerGutterWidth / 2));

        // If we have a healthy distribution in both halves, treat as 2 columns
        if (leftHalfBlocks.length > 0 && rightHalfBlocks.length > 0 &&
            Math.abs(leftHalfBlocks.length - rightHalfBlocks.length) < blocks.length * 0.7) {

            return [
                this.createZone('column', leftHalfBlocks),
                this.createZone('column', rightHalfBlocks)
            ];
        }

        // Default: Single Column
        return [this.createZone('column', blocks)];
    }

    private createZone(type: OCRZone['type'], blocks: OCRBlock[]): OCRZone {
        // Sort blocks in reading order within the zone (Y then X)
        const sorted = [...blocks].sort((a, b) => {
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) > 5) return yDiff;
            return a.x - b.x;
        });

        const xMin = Math.min(...blocks.map(b => b.x));
        const yMin = Math.min(...blocks.map(b => b.y));
        const xMax = Math.max(...blocks.map(b => b.x + b.width));
        const yMax = Math.max(...blocks.map(b => b.y + b.height));

        return {
            type,
            blocks: sorted,
            bounds: { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin }
        };
    }

    /**
     * Flattens zones into a single string with semantic reconstruction.
     */
    reconstructText(zones: OCRZone[]): string {
        return zones.map(zone => {
            if (zone.type === 'generic' && this.isTabular(zone)) {
                return this.reconstructAsTable(zone);
            }

            const zoneText = zone.blocks.map(b => b.text).join('\n');
            const prefix = zone.type !== 'column' && zone.type !== 'generic' ? `[${zone.type.toUpperCase()}]\n` : '';
            return prefix + zoneText;
        }).join('\n\n');
    }

    /**
     * Extracts structured table data (Array of tables, each a 2D array) from zones.
     */
    extractTables(zones: OCRZone[]): string[][][] {
        const tables: string[][][] = [];
        for (const zone of zones) {
            if (zone.type === 'generic' && this.isTabular(zone)) {
                tables.push(this.getTabularData(zone));
            }
        }
        return tables;
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

    private isTabular(zone: OCRZone): boolean {
        // If a zone has many blocks aligned horizontally, it's a table
        const rowCount = new Set(zone.blocks.map(b => Math.round(b.y / 10))).size;
        return zone.blocks.length > rowCount * 1.5;
    }

    private reconstructAsTable(zone: OCRZone): string {
        const rows = this.getTabularData(zone);
        if (rows.length === 0) return '';

        let markdown = '| ' + rows[0].join(' | ') + ' |\n';
        markdown += '| ' + rows[0].map(() => '---').join(' | ') + ' |\n';

        for (let i = 1; i < rows.length; i++) {
            markdown += '| ' + rows[i].join(' | ') + ' |\n';
        }

        return `[TABLE DETECTED]\n${markdown}`;
    }
}

export const ocrLayoutAnalyzer = new OcrLayoutAnalyzer();
