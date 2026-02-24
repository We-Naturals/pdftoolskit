
import * as XLSX from 'xlsx';
import { layoutAnalyzer } from '../analysis/layout-analyzer';

/**
 * PDF to Excel (XLSX) Reconstruction Engine.
 * Uses LayoutAnalyzer to detect grid patterns and map them to Excel cells.
 */
export async function pdfToExcel(file: File | Blob): Promise<Blob> {
    const analysis = await layoutAnalyzer.analyze(file);
    const wb = XLSX.utils.book_new();

    analysis.pages.forEach((page, index) => {
        // Group blocks by Y coordinate (lines) with a small tolerance
        const lines = new Map<number, unknown[]>();
        page.blocks.forEach(block => {
            const roundedY = Math.round(block.y / 5) * 5;
            if (!lines.has(roundedY)) lines.set(roundedY, []);
            lines.get(roundedY)!.push(block);
        });

        // Sort lines from top to bottom
        const sortedYs = Array.from(lines.keys()).sort((a, b) => b - a);
        const sheetData: unknown[][] = [];

        sortedYs.forEach(y => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lineBlocks = (lines.get(y) as any[]).sort((a, b) => a.x - b.x);
            const row: unknown[] = [];

            // Simplified: each block is a cell.
            // In a better version, we would check X-intervals to place in correct columns.
            lineBlocks.forEach(block => {
                row.push(block.text);
            });

            sheetData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, `Page ${index + 1}`);
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
