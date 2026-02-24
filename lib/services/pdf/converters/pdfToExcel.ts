/* eslint-disable */
import * as XLSX from 'xlsx';
import { pdfjsLib } from '../../../utils/pdf-init';
import { webGpuVisionEngine } from '../../../engines/webgpu-vision';

export interface PdfToExcelOptions {
    mergePages: boolean;
    detectNumbers: boolean;
    pageRange?: number[];
}

function castValue(str: string, detectNumbers: boolean): string | number {
    if (!detectNumbers) return str;
    const clean = str.replace(/[$,\s]/g, '');
    if (clean && !isNaN(Number(clean)) && /^\d+(\.\d+)?$/.test(clean)) {
        return Number(clean);
    }
    if (clean.endsWith('%')) {
        const pClean = clean.slice(0, -1);
        if (!isNaN(Number(pClean))) {
            return Number(pClean) / 100;
        }
    }
    return str;
}

export async function pdfToExcel(
    file: File,
    options: PdfToExcelOptions
): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    const workbook = XLSX.utils.book_new();
    const allData: any[][] = [];

    let previousColumnSlots: number[] = [];
    let currentSheetData: any[][] = [];
    let currentSheetIndex = 1;

    const pagesToProcess = options.pageRange || Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);

    for (const pageNum of pagesToProcess) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];

        // 1. FORENSIC GRID MAPPER: Precise Column Boundary Detection
        const opList = await page.getOperatorList();
        const verticalLines: number[] = [];
        let currentX = 0, currentY = 0;

        for (let i = 0; i < opList.fnArray.length; i++) {
            const fn = opList.fnArray[i];
            const args = opList.argsArray[i];

            if (fn === pdfjsLib.OPS.constructPath && args) {
                const pathOps = args[0] as number[];
                const pathArgs = args[1] as number[];
                let argIdx = 0;

                for (let j = 0; j < pathOps.length; j++) {
                    const op = pathOps[j];
                    if (op === pdfjsLib.OPS.moveTo) {
                        currentX = pathArgs[argIdx++];
                        currentY = pathArgs[argIdx++];
                    } else if (op === pdfjsLib.OPS.lineTo) {
                        const nextX = pathArgs[argIdx++];
                        const nextY = pathArgs[argIdx++];
                        if (Math.abs(nextX - currentX) < 2.0 && Math.abs(nextY - currentY) > 10) {
                            verticalLines.push(currentX);
                        }
                        currentX = nextX;
                        currentY = nextY;
                    } else if (op === pdfjsLib.OPS.rectangle) {
                        const rx = pathArgs[argIdx++];
                        const _ry = pathArgs[argIdx++];
                        const rw = pathArgs[argIdx++];
                        const rh = pathArgs[argIdx++];
                        if (Math.abs(rh) > 10) {
                            verticalLines.push(rx);
                            verticalLines.push(rx + rw);
                        }
                    }
                }
            }
        }

        const explicitColumns: number[] = [];
        new Set(verticalLines.map(v => Math.floor(v))).forEach(v => explicitColumns.push(v));
        explicitColumns.sort((a, b) => a - b);
        const cleanExplicitSlots: number[] = [];
        explicitColumns.forEach(c => {
            if (cleanExplicitSlots.length === 0 || c - cleanExplicitSlots[cleanExplicitSlots.length - 1] > 5) {
                cleanExplicitSlots.push(c);
            }
        });

        const columnSlots: number[] = [];
        const pageWidth = page.getViewport({ scale: 1.0 }).width;

        if (cleanExplicitSlots.length > 2) {
            columnSlots.push(...cleanExplicitSlots);
        } else {
            // WebGPU Fallback...
            columnSlots.push(0); // Simplification for range refactor
        }

        const rows: Record<string, { x: number, str: string }[]> = {};
        items.forEach((item: any) => {
            const y = Math.round(item.transform[5]);
            if (!rows[y]) rows[y] = [];
            rows[y].push({ x: item.transform[4], str: item.str });
        });

        const sortedY = Object.keys(rows).sort((a, b) => parseInt(b) - parseInt(a));

        sortedY.forEach(y => {
            const rowItems = rows[y].sort((a, b) => a.x - b.x);
            const rowOutput = new Array(columnSlots.length).fill('');

            rowItems.forEach(item => {
                let bestSlot = 0;
                for (let i = 0; i < columnSlots.length; i++) {
                    if (item.x >= columnSlots[i] - 5) {
                        bestSlot = i;
                    } else {
                        break;
                    }
                }
                const val = castValue(item.str, options.detectNumbers);
                if (rowOutput[bestSlot] !== '') {
                    rowOutput[bestSlot] = `${rowOutput[bestSlot]} ${val}`;
                } else {
                    rowOutput[bestSlot] = val;
                }
            });

            if (options.mergePages) {
                allData.push(rowOutput);
            } else {
                currentSheetData.push(rowOutput);
            }
        });

        previousColumnSlots = [...columnSlots];
    }

    if (!options.mergePages && currentSheetData.length > 0) {
        const worksheet = XLSX.utils.aoa_to_sheet(currentSheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, `Table ${currentSheetIndex}`);
    }

    if (options.mergePages) {
        const worksheet = XLSX.utils.aoa_to_sheet(allData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidated Data');
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Uint8Array(excelBuffer);
}
