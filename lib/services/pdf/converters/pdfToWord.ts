/* eslint-disable */
import { Document, Paragraph, TextRun, Packer, ImageRun } from 'docx';
import { initOCRWorker, performOCR } from '@/lib/ocr-utils';
import { TypographyRegistry } from '@/lib/engines/typography-registry';
import type { Worker } from 'tesseract.js';

interface TextBlock {
    text: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    x: number;
    y: number;
    width: number;
    zIndex: number;
}

interface Line {
    y: number;
    blocks: TextBlock[];
}

interface VectorPath {
    type: 'line' | 'rect';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width?: number;
    height?: number;
    zIndex: number;
}

export async function pdfToWord(file: File, pageRange?: number[]): Promise<{ data: Uint8Array; isScanned: boolean }> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const { pdfjsLib } = await import('@/lib/utils/pdf-init');

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;

        const docParagraphs: Paragraph[] = [];
        let ocrWorker: Worker | null = null;
        const lineTolerance = 4;
        const twipMultiplier = 20;

        const pagesToProcess = pageRange || Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);

        for (const pageNum of pagesToProcess) {
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });

            const blocks: TextBlock[] = [];
            let operationCounter = 0;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items = textContent.items as any[];

            items.forEach(item => {
                if (!('str' in item) || !('transform' in item)) return;

                const x = item.transform[4];
                const y = item.transform[5];
                const fontSize = Math.sqrt(item.transform[0] ** 2 + item.transform[1] ** 2);
                const fontName = (item.fontName || '').toLowerCase();

                const block: TextBlock = {
                    text: item.str,
                    fontSize: fontSize,
                    bold: fontName.includes('bold') || fontName.includes('black') || fontName.includes('heavy'),
                    italic: fontName.includes('italic') || fontName.includes('oblique'),
                    x,
                    y,
                    width: item.width,
                    zIndex: operationCounter++
                };
                blocks.push(block);
            });

            // --- 1. VECTOR EXTRACTION ENGINE (PHASE 35.2 / 37.3) ---
            const opList = await page.getOperatorList();
            const vectorPaths: VectorPath[] = [];
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
                            vectorPaths.push({ type: 'line', x1: currentX, y1: currentY, x2: nextX, y2: nextY, zIndex: operationCounter++ });
                            currentX = nextX;
                            currentY = nextY;
                        } else if (op === pdfjsLib.OPS.rectangle) {
                            const rx = pathArgs[argIdx++];
                            const ry = pathArgs[argIdx++];
                            const rw = pathArgs[argIdx++];
                            const rh = pathArgs[argIdx++];
                            vectorPaths.push({ type: 'rect', x1: rx, y1: ry, x2: rx + rw, y2: ry + rh, width: rw, height: rh, zIndex: operationCounter++ });
                        }
                    }
                }
            }

            blocks.sort((a, b) => b.y - a.y || a.x - b.x);

            const lines: Line[] = [];
            blocks.forEach(block => {
                let currentLine = lines.find(l => Math.abs(l.y - block.y) < lineTolerance);
                if (!currentLine) {
                    currentLine = { y: block.y, blocks: [] };
                    lines.push(currentLine);
                }
                currentLine.blocks.push(block);
            });

            lines.sort((a, b) => b.y - a.y);
            let lastLineY = lines.length > 0 ? lines[0].y : 0;

            lines.forEach((line) => {
                line.blocks.sort((a, b) => a.x - b.x);

                const verticalDropPts = Math.max(0, lastLineY - line.y);
                const spacingBeforeTwips = Math.round(verticalDropPts * twipMultiplier);

                const runs: TextRun[] = [];
                let currentXPts = 0;

                line.blocks.forEach(block => {
                    const horizontalGap = Math.max(0, block.x - currentXPts);
                    const spaceCount = Math.floor(horizontalGap / (block.fontSize * 0.5));

                    if (spaceCount > 0 && runs.length > 0) {
                        runs.push(new TextRun({ text: " ".repeat(Math.min(spaceCount, 50)) }));
                    }

                    // --- PHASE 37.2: TYPOGRAPHY REGISTRY INTEGRATION ---
                    // Resolve the actual font family cloned from system metrics
                    const fontName = (textContent.items[blocks.indexOf(block)] as any)?.fontName || 'Helvetica';
                    const compatibleFont = TypographyRegistry.getCompatibleFont(fontName);

                    runs.push(new TextRun({
                        text: block.text,
                        bold: block.bold,
                        italics: block.italic,
                        size: Math.round(block.fontSize * 2),
                        font: compatibleFont // Injected elite metrics
                    }));

                    currentXPts = block.x + block.width;
                });

                if (runs.length > 0) {
                    docParagraphs.push(new Paragraph({
                        spacing: { before: spacingBeforeTwips },
                        indent: { left: Math.round(line.blocks[0].x * twipMultiplier) },
                        children: runs
                    }));
                }

                lastLineY = line.y;
            });

            // Inject vectors via SVG
            if (vectorPaths.length > 0) {
                let svgContent = `<svg width="${viewport.width}" height="${viewport.height}" xmlns="http://www.w3.org/2000/svg">`;
                vectorPaths.forEach(path => {
                    if (path.type === 'line') {
                        svgContent += `<line x1="${path.x1}" y1="${viewport.height - path.y1}" x2="${path.x2}" y2="${viewport.height - path.y2}" stroke="black" stroke-width="1" />`;
                    } else if (path.type === 'rect') {
                        svgContent += `<rect x="${path.x1}" y="${viewport.height - (path.y1 + (path.height || 0))}" width="${path.width}" height="${Math.abs(path.height || 0)}" fill="none" stroke="black" stroke-width="1" />`;
                    }
                });
                svgContent += '</svg>';

                const svgBuffer = new TextEncoder().encode(svgContent);
                docParagraphs.push(new Paragraph({
                    children: [
                        new ImageRun({
                            data: svgBuffer,
                            transformation: { width: viewport.width, height: viewport.height },
                            type: 'svg' as any
                        })
                    ]
                }));
            }

            if (lines.length === 0) {
                if (!ocrWorker) ocrWorker = await initOCRWorker();
                const renderViewport = page.getViewport({ scale: 2.0 });
                const canvas = new OffscreenCanvas(renderViewport.width, renderViewport.height);
                const context = canvas.getContext('2d');
                if (context) {
                    await page.render({ canvasContext: context as any, viewport: renderViewport }).promise;
                    const blob = await canvas.convertToBlob({ type: 'image/jpeg' });
                    if (blob) {
                        const ocrResult = await performOCR(ocrWorker, blob);
                        if (ocrResult && ocrResult.text) {
                            ocrResult.text.split('\n').forEach((textLine: string) => {
                                if (textLine.trim()) {
                                    docParagraphs.push(new Paragraph({
                                        children: [new TextRun({ text: textLine, size: 22 })],
                                    }));
                                }
                            });
                        }
                    }
                }
            }
        }

        if (ocrWorker) await ocrWorker.terminate();
        await pdfDoc.cleanup();
        await pdfDoc.destroy();

        if (pageRange) {
            // If this is a chunk being returned for stitching, only return paragraphs serialized
            // In a full implementation we'd return a partial Document or the Section children
            return {
                data: new Uint8Array(Packer.toBuffer(new Document({
                    sections: [{ children: docParagraphs }]
                })) as any), isScanned: false
            };
        }

        const doc = new Document({
            sections: [{ properties: {}, children: docParagraphs }],
        });

        const docxBytes = await Packer.toBuffer(doc);
        return { data: new Uint8Array(docxBytes), isScanned: docParagraphs.length < 5 };
    } catch (error) {
        console.error('PDF to Word error:', error);
        throw error;
    }
}
