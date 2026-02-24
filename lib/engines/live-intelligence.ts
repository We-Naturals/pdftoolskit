/* eslint-disable */
import { OcrEngine } from './ocr-engine';
import { SmartPatternMatcher } from '../ai/intelligence-engine';

export interface LiveIntelligenceResult {
    text: string;
    normalizedBox: { x: number, y: number, w: number, h: number };
    isPII: boolean;
    type?: 'invoice' | 'contract' | 'id' | 'generic';
}

/**
 * Live Intelligence Engine
 * Orchestrates background OCR sampling and real-time AR text projection logic.
 */
export class LiveIntelligenceEngine {
    private isProcessing = false;
    private lastResult: LiveIntelligenceResult[] = [];

    /**
     * Samples a frame and performs OCR in the background.
     * Throttled to ~2 FPS to prevent performance degradation.
     */
    async sample(canvas: HTMLCanvasElement): Promise<LiveIntelligenceResult[]> {
        if (this.isProcessing) return this.lastResult;
        this.isProcessing = true;

        try {
            // 1. Capture snapshot from the WebGPU/Vision canvas
            const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.5));

            // 2. Perform lightweight OCR
            const engine = new OcrEngine();
            const ocrResult = await engine.recognize(blob as File, { language: 'eng' });
            const text = ocrResult.text.toLowerCase();

            // 3. Determine Document Intent (Apex Heuristics)
            let docType: LiveIntelligenceResult['type'] = 'generic';
            if (text.includes('invoice') || text.includes('amount due') || text.includes('total')) docType = 'invoice';
            else if (text.includes('agreement') || text.includes('signature') || text.includes('hereby')) docType = 'contract';
            else if (text.includes('passport') || text.includes('nationality') || text.includes('dob')) docType = 'id';

            // 4. Process results for PII and normalization
            const results: LiveIntelligenceResult[] = [];
            const lines = ocrResult.text.split('\n').filter(l => l.trim().length > 5);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const matches = await SmartPatternMatcher.scanText(line);
                const isPII = matches.length > 0;

                // Simulate spatial distribution based on line index
                results.push({
                    text: isPII ? '[REDACTED]' : line.substring(0, 40) + (line.length > 40 ? '...' : ''),
                    isPII,
                    type: docType,
                    normalizedBox: {
                        x: 0.15 + (Math.random() * 0.1),
                        y: 0.15 + (i * 0.08),
                        w: 0.7,
                        h: 0.04
                    }
                });
            }

            this.lastResult = results;
        } catch (e) {
            console.error('Live sampling failed', e);
        } finally {
            this.isProcessing = false;
        }

        return this.lastResult;
    }
}

export const liveIntelligence = new LiveIntelligenceEngine();
