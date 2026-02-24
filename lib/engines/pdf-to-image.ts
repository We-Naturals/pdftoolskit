/* eslint-disable */
import { pdfjsLib } from '../utils/pdf-init';

export interface PdfToImageOptions {
    quality?: number;
    dpi?: number;
    format?: 'jpg' | 'png' | 'webp';
    pages?: 'all' | number[];
}

/**
 * High-fidelity PDF to Image conversion using PDF.js
 * Optimized for high-DPI rendering and professional output.
 */
export async function pdfToImage(
    file: File | Blob,
    options: PdfToImageOptions = {}
): Promise<Blob[]> {
    const { quality = 0.8, dpi = 150, format = 'jpg' } = options;
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const scale = dpi / 72; // PDF standard is 72 DPI
    const results: Blob[] = [];

    const pagesToConvert = options.pages === 'all' || !options.pages
        ? Array.from({ length: pdf.numPages }, (_, i) => i + 1)
        : options.pages;

    for (const pageNum of pagesToConvert) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Create canvas for rendering
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context');

        // Render PDF page to canvas
        const renderContext = {
            canvasContext: context as any,
            viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Convert canvas to Blob
        const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
        const blob = await canvas.convertToBlob({ type: mimeType, quality });

        if (blob) {
            results.push(blob);
        }
    }

    return results;
}
