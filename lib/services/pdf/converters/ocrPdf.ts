/* eslint-disable */
import { createScheduler, createWorker } from 'tesseract.js';
import { pdfjsLib } from '../../../utils/pdf-init';
import { PDFDocument } from 'pdf-lib';

export interface OcrOptions {
    languages: string[];
    adaptiveThreshold: boolean;
    onProgress?: (progress: { page: number, total: number, workerId: number }) => void;
}

// Pre-processing filter: Adaptive Thresholding
function preprocessImage(canvas: any, adaptive: boolean): any {
    if (!adaptive) return canvas;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Adaptive Thresholding logic (Otsu's simplified)
    // We calculate the mean luminance and use it as a threshold
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
        // eslint-disable-next-line security/detect-object-injection
        const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        sum += luminance;
    }
    const mean = sum / (data.length / 4);
    const threshold = mean * 0.95; // Slightly lower than mean to pick up text better

    for (let i = 0; i < data.length; i += 4) {
        // eslint-disable-next-line security/detect-object-injection
        const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        const val = luminance > threshold ? 255 : 0;
        // eslint-disable-next-line security/detect-object-injection
        data[i] = data[i + 1] = data[i + 2] = val;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

export async function* ocrPdfGenerator(
    file: File,
    options: OcrOptions
): AsyncGenerator<{ page: number, text: string, pdfPage?: Uint8Array }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfDoc.numPages;

    // Initialize Scheduler and Pool
    const scheduler = createScheduler();
    const numWorkers = Math.min(4, navigator.hardwareConcurrency || 2);
    await Promise.all(
        Array.from({ length: numWorkers }).map(async () => {
            const worker = await createWorker(options.languages.join('+'));
            scheduler.addWorker(worker);
            return worker;
        })
    );

    try {
        // --- PHASE 36.1: CONCURRENT JOB DISPATCH ---
        const pagePromises = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = new OffscreenCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context!, viewport }).promise;

            const processedCanvas = preprocessImage(canvas, options.adaptiveThreshold);

            // Dispatch job without awaiting immediately
            const job = scheduler.addJob('recognize', processedCanvas, { pdfTitle: `Page ${i}` });
            pagePromises.push(job.then((res: any) => ({
                page: i,
                text: res.data.text,
                pdfPage: new Uint8Array(res.data.pdf as any)
            })));

            if (options.onProgress) options.onProgress({ page: i, total: numPages, workerId: 0 });
        }

        // Await all pages in parallel
        const results = await Promise.all(pagePromises);
        results.sort((a, b) => a.page - b.page);

        for (const result of results) {
            yield result;
        }
    } finally {
        await scheduler.terminate();
    }
}

export async function imageOcr(file: File, options: OcrOptions): Promise<{ text: string }> {
    const worker = await createWorker(options.languages.join('+'));
    try {
        const { data: { text } } = await worker.recognize(file);
        return { text };
    } finally {
        await worker.terminate();
    }
}

export async function ocrPdfFull(file: File, options: OcrOptions): Promise<{ pdf: Uint8Array, text: string }> {
    if (file.type.startsWith('image/')) {
        const { text } = await imageOcr(file, options);
        return { pdf: new Uint8Array(), text };
    }

    const generator = ocrPdfGenerator(file, options);
    const mergedPdf = await PDFDocument.create();
    let fullText = '';

    for await (const result of generator) {
        fullText += `--- Page ${result.page} ---\n\n${result.text}\n\n`;
        if (result.pdfPage) {
            const pagePdf = await PDFDocument.load(result.pdfPage);
            const [copiedPage] = await mergedPdf.copyPages(pagePdf, [0]);
            mergedPdf.addPage(copiedPage);
        }
    }

    const pdf = await mergedPdf.save();
    return { pdf, text: fullText };
}
