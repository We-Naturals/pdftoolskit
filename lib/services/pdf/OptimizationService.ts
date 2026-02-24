
/* eslint-disable */
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { applyBranding, ensurePDFDoc, getFileArrayBuffer } from './core';
import { GeometricOptimizer } from './manipulators/geometric-optimizer';

export interface OptimizationOptions {
    quality?: number;
    targetSizeBytes?: number;
    scale?: number;
    stripMetadata?: boolean;
    mode?: 'lossless' | 'balanced' | 'extreme';
}

export class OptimizationService {
    /**
     * Entry point for PDF optimization
     */
    static async optimize(input: File | Blob | PDFDocument | Uint8Array, options: OptimizationOptions = {}): Promise<Uint8Array | PDFDocument> {
        const { quality = 0.7, targetSizeBytes, stripMetadata = true, mode = 'balanced' } = options;

        const pdf = await ensurePDFDoc(input);

        if (stripMetadata) {
            pdf.setTitle('');
            pdf.setAuthor('');
            pdf.setSubject('');
            pdf.setKeywords([]);
            pdf.setProducer('PDFToolskit Optimization Engine');
            pdf.setCreator('PDFToolskit');
        }

        applyBranding(pdf);

        // 1. Structural Optimization (Object Streams)
        let compressed = await pdf.save({
            useObjectStreams: true,
            addDefaultPage: false,
        });

        // 2. Geometric Optimization (Neural Compression Mode)
        if (mode === 'extreme' || mode === 'balanced') {
            await GeometricOptimizer.simplify(pdf, mode === 'extreme' ? 1.0 : 0.5);
        }

        // 3. Content-Aware Image Downsampling
        if (mode !== 'lossless') {
            try {
                const currentBytes = await pdf.save({ useObjectStreams: true });
                const optimizedPdf = await this.downsampleImages(currentBytes, mode === 'extreme' ? 0.5 : 0.75, mode === 'extreme' ? 0.6 : 1.0);
                compressed = optimizedPdf;
            } catch (err) {
                console.warn("Selective downsampling failed, falling back to structural optimization.", err);
            }
        }

        // 4. Binary Search Target Optimization (Raster-based fallback)
        if (targetSizeBytes && compressed.length > targetSizeBytes) {
            const tempBlob = new Blob([compressed as any], { type: 'application/pdf' });
            compressed = await this.runOptimizationLoop(tempBlob, targetSizeBytes, quality);
        }

        if (input instanceof PDFDocument) {
            return await PDFDocument.load(compressed);
        }
        return compressed;
    }

    private static async downsampleImages(buffer: ArrayBuffer | Uint8Array, quality: number, scale: number): Promise<Uint8Array> {
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();

        for (const page of pages) {
            const { node } = page as any;
            const resources = node.Resources();
            if (!resources) continue;

            const xObjects = resources.get(PDFName.of('XObject'));
            if (!xObjects) continue;

            const xObjectDict = pdfDoc.context.lookup(xObjects);
            if (!(xObjectDict instanceof Map)) continue;

            for (const [name, ref] of (xObjectDict as any).entries()) {
                const xObject = pdfDoc.context.lookup(ref);
                if (!(xObject instanceof PDFRawStream)) continue;

                const subtype = xObject.dict.get(PDFName.of('Subtype'));
                if (subtype !== PDFName.of('Image')) continue;

                const widthObj = xObject.dict.get(PDFName.of('Width'));
                const heightObj = xObject.dict.get(PDFName.of('Height'));
                const width = (widthObj as any)?.asNumber?.();
                const height = (heightObj as any)?.asNumber?.();

                // Only downsample large images
                if (width && height && width * height > 500000) {
                    try {
                        const imageBytes = xObject.contents;
                        const newBytes = await this.reencodeImage(imageBytes, quality, scale);
                        if (newBytes && newBytes.length < imageBytes.length) {
                            const newImage = await pdfDoc.embedJpg(newBytes);
                            (xObjectDict as any).set(name, (newImage as any).ref);
                        }
                    } catch (e) {
                        console.error("Failed to re-encode XObject:", name, e);
                    }
                }
            }
        }

        return await pdfDoc.save({ useObjectStreams: true });
    }

    private static async reencodeImage(bytes: Uint8Array, quality: number, scale: number): Promise<Uint8Array | null> {
        try {
            const blob = new Blob([bytes as any]);
            const imageBitmap = await createImageBitmap(blob);

            const width = Math.floor(imageBitmap.width * scale);
            const height = Math.floor(imageBitmap.height * scale);

            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            ctx.drawImage(imageBitmap, 0, 0, width, height);
            const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
            imageBitmap.close();

            return new Uint8Array(await outBlob.arrayBuffer());
        } catch (e) {
            console.error('Re-encode image failed:', e);
            return null;
        }
    }

    private static async rasterize(buffer: ArrayBuffer | Uint8Array, options: { quality: number; scale: number }): Promise<Uint8Array> {
        const { quality, scale } = options;
        const { pdfjsLib } = await import('@/lib/utils/pdf-init');

        // In worker, we rely on the host to have set workerSrc or it might just work if bundled
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        const newPdf = await PDFDocument.create();

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });

            const canvas = new OffscreenCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');

            if (context) {
                await page.render({ canvasContext: context as any, viewport }).promise;
                const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
                const imageBytes = await blob.arrayBuffer();
                const embeddedImage = await newPdf.embedJpg(imageBytes);

                const newPage = newPdf.addPage([viewport.width / scale, viewport.height / scale]);
                newPage.drawImage(embeddedImage, {
                    x: 0,
                    y: 0,
                    width: viewport.width / scale,
                    height: viewport.height / scale
                });
            }
        }

        applyBranding(newPdf);
        const result = await newPdf.save();
        await pdf.destroy();
        return result;
    }

    private static async runOptimizationLoop(blob: Blob, targetSize: number, initialQuality: number): Promise<Uint8Array> {
        const buffer = await blob.arrayBuffer();
        let currentScale = 1.2;
        let currentQuality = initialQuality;
        let bestResult: Uint8Array | null = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            const result = await this.rasterize(buffer, { quality: currentQuality, scale: currentScale });
            if (!bestResult || result.length < bestResult.length) bestResult = result;
            if (result.length <= targetSize) return result;

            currentQuality -= 0.15;
            currentScale -= 0.2;
            if (currentQuality < 0.1 || currentScale < 0.3) break;
        }

        return bestResult || new Uint8Array();
    }
}
