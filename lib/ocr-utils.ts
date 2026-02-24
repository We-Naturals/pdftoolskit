/* eslint-disable */
import type { Worker } from 'tesseract.js';

export interface VectorPath {
    type: 'hline' | 'vline' | 'rect' | 'logo' | 'signature' | 'blob';
    x: number;
    y: number;
    w: number;
    h: number;
    data?: string;
}

export interface MRCResult {
    background: Blob;
    mask: Blob;
}

export interface DetailedOCRResult {
    text: string;
    blocks: {
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        confidence: number;
    }[];
    graphics: VectorPath[];
    mrc?: MRCResult;
}

export type VisionProfile = 'binarized' | 'grayscale' | 'nuanced';

/**
 * Advanced Vision Filters for Phase 17.3 and 22.1
 */
export class OcrVision {
    static async preprocessImage(blob: Blob, profile: VisionProfile = 'binarized'): Promise<{ blob: Blob, graphics: VectorPath[] }> {
        const img = await createImageBitmap(blob);
        const scale = 2.5;
        const width = img.width * scale;
        const height = img.height * scale;

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let graphics: VectorPath[] = [];

        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);

            // 1. Auto-Deskew FIRST (Crucial for geometry alignment)
            await this.autoDeskew(canvas, ctx);

            // 2. Denoise
            this.applyDenoise(ctx, width, height);

            // 3. Background Reconstruction (Shadow/Fold Removal)
            this.cleanBackground(ctx, width, height);

            // 4. Profile-Specific Processing
            if (profile === 'binarized') {
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                const threshold = this.calculateOtsuThreshold(data);

                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                    const val = gray > threshold ? 255 : 0;
                    data[i] = data[i + 1] = data[i + 2] = val;
                }
                ctx.putImageData(imageData, 0, 0);

                // Batch 22.1: Detect Vector Paths (Now perfectly aligned)
                graphics = this.detectGraphics(ctx, width, height);
            } else {
                ctx.filter = 'contrast(1.2) grayscale(1)';
                ctx.drawImage(canvas, 0, 0);
                ctx.filter = 'none';
            }
        }
        img.close();
        const blobResult = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
        return { blob: blobResult, graphics };
    }

    private static calculateOtsuThreshold(data: Uint8ClampedArray): number {
        const hist = new Int32Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
            hist[gray]++;
        }

        const total = data.length / 4;
        let sum = 0;
        for (let t = 0; t < 256; t++) sum += t * hist[t];

        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let varMax = 0;
        let threshold = 140;

        for (let t = 0; t < 256; t++) {
            wB += hist[t];
            if (wB === 0) continue;
            wF = total - wB;
            if (wF === 0) break;

            sumB += t * hist[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;

            const varBetween = wB * wF * (mB - mF) * (mB - mF);

            if (varBetween > varMax) {
                varMax = varBetween;
                threshold = t;
            }
        }
        return threshold;
    }

    private static detectGraphics(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number): VectorPath[] {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const graphics: VectorPath[] = [];
        const minLineLength = Math.max(w, h) * 0.05; // 5% of document

        // Simple Scanning for Horizontal Lines
        for (let y = 0; y < h; y += 4) { // Sample every 4 rows
            let startX = -1;
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                if (data[idx] === 0) { // Black
                    if (startX === -1) startX = x;
                } else if (startX !== -1) {
                    if (x - startX > minLineLength) {
                        graphics.push({ type: 'hline', x: startX, y, w: x - startX, h: 2 });
                    }
                    startX = -1;
                }
            }
        }

        // Simple Scanning for Vertical Lines
        for (let x = 0; x < w; x += 4) { // Sample every 4 cols
            let startY = -1;
            for (let y = 0; y < h; y++) {
                const idx = (y * w + x) * 4;
                if (data[idx] === 0) {
                    if (startY === -1) startY = y;
                } else if (startY !== -1) {
                    if (y - startY > minLineLength) {
                        graphics.push({ type: 'vline', x, y: startY, w: 2, h: y - startY });
                    }
                    startY = -1;
                }
            }
        }

        // Detect Complex Blobs (Logos/Signatures)
        const blobs = this.findBlobs(data, w, h, graphics);
        graphics.push(...blobs);

        return graphics;
    }

    private static findBlobs(data: Uint8ClampedArray, w: number, h: number, existingLines: VectorPath[]): VectorPath[] {
        const blobs: VectorPath[] = [];
        const visited = new Uint8Array(w * h);
        const minSize = 25;
        const maxSize = Math.max(w, h) * 0.4;

        for (let y = 0; y < h; y += 15) { // Sparse sampling for performance
            for (let x = 0; x < w; x += 15) {
                const idx = y * w + x;
                if (data[idx * 4] === 0 && !visited[idx]) {
                    // Check if this point is inside an existing line
                    const isLine = existingLines.some(l =>
                        x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h
                    );
                    if (isLine) continue;

                    // Simple Flood Fill / Bounding Box extractor
                    const bb = this.extractBlobBoundingBox(data, w, h, x, y, visited);
                    if (bb && bb.w > minSize && bb.h > minSize && bb.w < maxSize && bb.h < maxSize) {
                        const type = (bb.y > h * 0.65 && bb.w > bb.h * 1.5) ? 'signature' : 'logo';
                        blobs.push({ type, ...bb });
                    }
                }
            }
        }
        return blobs;
    }

    private static extractBlobBoundingBox(data: Uint8ClampedArray, w: number, h: number, startX: number, startY: number, visited: Uint8Array) {
        let minX = startX, maxX = startX, minY = startY, maxY = startY;
        const stack = [[startX, startY]];
        let count = 0;

        while (stack.length > 0 && count < 3000) {
            const [cx, cy] = stack.pop()!;
            const idx = cy * w + cx;
            if (visited[idx]) continue;
            visited[idx] = 1;
            count++;

            minX = Math.min(minX, cx);
            maxX = Math.max(maxX, cx);
            minY = Math.min(minY, cy);
            maxY = Math.max(maxY, cy);

            // Limited 4-way check
            const neighbors = [[cx + 10, cy], [cx - 10, cy], [cx, cy + 10], [cx, cy - 10]];
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const nidx = ny * w + nx;
                    if (data[nidx * 4] === 0 && !visited[nidx]) {
                        stack.push([nx, ny]);
                    }
                }
            }
        }

        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    private static applyDenoise(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number) {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        for (let i = 4 * w + 4; i < data.length - (4 * w + 4); i += 4) {
            if (data[i] === 0) {
                let neighbors = 0;
                if (data[i - 4] === 0) neighbors++;
                if (data[i + 4] === 0) neighbors++;
                if (data[i - (4 * w)] === 0) neighbors++;
                if (data[i + (4 * w)] === 0) neighbors++;
                if (neighbors < 2) data[i] = data[i + 1] = data[i + 2] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    private static cleanBackground(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number) {
        // High-fidelity background reconstruction
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            // If the pixel is "page-like" (white/gray), push it to pure white
            if (gray > 180) {
                data[i] = data[i + 1] = data[i + 2] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    private static async autoDeskew(canvas: OffscreenCanvas, ctx: OffscreenCanvasRenderingContext2D) {
        const angle = this.detectSkewAngle(ctx, canvas.width, canvas.height);
        if (Math.abs(angle) > 0.5) {
            const temp = new OffscreenCanvas(canvas.width, canvas.height);
            const tctx = temp.getContext('2d', { willReadFrequently: true })!;
            tctx.translate(canvas.width / 2, canvas.height / 2);
            tctx.rotate((angle * Math.PI) / 180);
            tctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(temp, 0, 0);
        }
    }

    private static detectSkewAngle(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number): number {
        // Projective Variance Algorithm (High-Speed sampling)
        const sampleWidth = Math.min(w, 400);
        const sampleHeight = Math.min(h, 400);
        const imageData = ctx.getImageData((w - sampleWidth) / 2, (h - sampleHeight) / 2, sampleWidth, sampleHeight);
        const data = imageData.data;

        let maxVariance = 0;
        let bestAngle = 0;

        // Test angles from -5 to 5 degrees with 0.5 deg precision
        for (let angle = -5; angle <= 5; angle += 0.5) {
            const variance = this.calculateProjectionVariance(data, sampleWidth, sampleHeight, angle);
            if (variance > maxVariance) {
                maxVariance = variance;
                bestAngle = angle;
            }
        }
        return bestAngle;
    }

    private static calculateProjectionVariance(data: Uint8ClampedArray, w: number, h: number, angle: number): number {
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const bins = new Float32Array(h).fill(0);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                if (data[idx] === 0) { // Black pixel
                    const rotatedY = Math.round(-x * sin + y * cos);
                    if (rotatedY >= 0 && rotatedY < h) {
                        bins[rotatedY]++;
                    }
                }
            }
        }

        // Variance of the projection bins
        const mean = bins.reduce((a, b) => a + b, 0) / h;
        return bins.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / h;
    }

    /**
     * Mixed Raster Content (MRC) Layering
     * Batch 23.1: Separates Paper Background from Ink Mask.
     */
    static async generateMRCLayers(blob: Blob): Promise<MRCResult> {
        try {
            const img = await createImageBitmap(blob);
            const w = img.width;
            const h = img.height;

            // 1. Paper Layer (Background) - Downsampled and High-Compression
            const bgCanvas = new OffscreenCanvas(w / 2, h / 2); // Downsample for size
            const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true })!;
            bgCtx.drawImage(img, 0, 0, w / 2, h / 2);

            // Remove text from background (In-painting lite)
            const bgData = bgCtx.getImageData(0, 0, w / 2, h / 2);
            const bpix = bgData.data;
            const threshold = this.calculateOtsuThreshold(bpix);

            for (let i = 0; i < bpix.length; i += 4) {
                const gray = (bpix[i] + bpix[i + 1] + bpix[i + 2]) / 3;
                if (gray < threshold) { // If it's ink-like, push it to paper-white
                    bpix[i] = bpix[i + 1] = bpix[i + 2] = 255;
                }
            }
            bgCtx.putImageData(bgData, 0, 0);
            const background = await bgCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 }); // High compression

            // 2. Ink Mask (Foreground) - Monochrome and High Quality
            const maskCanvas = new OffscreenCanvas(w, h);
            const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })!;
            maskCtx.drawImage(img, 0, 0);
            const mData = maskCtx.getImageData(0, 0, w, h);
            const mpix = mData.data;

            // Recalculate for high-res mask precision
            const maskThreshold = this.calculateOtsuThreshold(mpix);

            for (let i = 0; i < mpix.length; i += 4) {
                const gray = (mpix[i] + mpix[i + 1] + mpix[i + 2]) / 3;
                const isInk = gray < maskThreshold;
                // Transparent background, solid black ink
                mpix[i] = mpix[i + 1] = mpix[i + 2] = 0;
                mpix[i + 3] = isInk ? 255 : 0;
            }
            maskCtx.putImageData(mData, 0, 0);
            const mask = await maskCanvas.convertToBlob({ type: 'image/png' }); // Lossless for mask clarity

            img.close();
            return { background, mask };
        } catch (e) {
            console.error("MRC Layering failed", e);
            // Fallback: Return original as background, empty mask
            return { background: blob, mask: blob };
        }
    }
}

export async function initOCRWorker(language: string = 'eng', onProgress?: (m: unknown) => void): Promise<Worker> {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker(language, 1, {
        logger: onProgress
    });
    return worker;
}

export async function performOCR(worker: Worker, blob: Blob, profile: VisionProfile = 'binarized', includeMRC: boolean = false): Promise<DetailedOCRResult> {
    const scale = 2.5;
    const { blob: processed, graphics } = await OcrVision.preprocessImage(blob, profile);
    const { data } = await worker.recognize(processed);

    const blocks = (data.blocks || []).map((block: any) => ({
        text: block.text,
        x: block.bbox.x0 / scale,
        y: block.bbox.y0 / scale,
        width: (block.bbox.x1 - block.bbox.x0) / scale,
        height: (block.bbox.y1 - block.bbox.y0) / scale,
        confidence: block.confidence
    }));

    const normalizedGraphics = graphics.map(g => ({
        ...g,
        x: g.x / scale,
        y: g.y / scale,
        w: g.w / scale,
        h: g.h / scale
    }));

    let mrc;
    if (includeMRC) {
        mrc = await OcrVision.generateMRCLayers(blob);
    }

    return {
        text: data.text || '',
        blocks,
        graphics: normalizedGraphics,
        mrc
    };
}
