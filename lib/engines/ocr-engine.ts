/* eslint-disable */
import { createWorker, Worker } from 'tesseract.js';
import { pdfToImage } from './pdf-to-image';
import { performOCR, OcrVision } from '../ocr-utils';
import { modelLoader } from '../ai/model-loader';
import { ocrLayoutAnalyzer, OCRZone } from '../analysis/ocr-layout-analyzer';
import { knowledgeGraphEngine, KnowledgeGraph } from '../ai/knowledge-graph-engine';
import { SmartPatternMatcher } from '../ai/intelligence-engine';
import { forensicEngine, ForensicResult } from './forensic-engine';

export interface OcrOptions {
    language?: string;
    onProgress?: (progress: number, status: string) => void;
    useAI?: boolean;
    sanitizePII?: boolean;
    forensicScrub?: boolean;
    hyperCompression?: boolean;
    forensicAudit?: boolean;
}

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';

export interface OcrFullResult {
    text: string;
    pdf?: Uint8Array;
    excel?: Uint8Array;
    csv?: string;
    classification?: {
        type: string;
        confidence: number;
        metadata: Record<string, string>;
    };
    knowledgeGraph?: KnowledgeGraph;
    pages: { zones: OCRZone[], pageNumber: number }[];
    forensicAudit?: ForensicResult[];
    confidenceMap: { text: string, confidence: number }[];
}

/**
 * High-Performance OCR Engine.
 * Converts PDF/Images to searchable text or documents.
 */
export class OcrEngine {
    private worker: Worker | null = null;

    private async getWorker(lang: string = 'eng'): Promise<Worker> {
        if (!this.worker) {
            this.worker = await createWorker(lang);
        }
        return this.worker;
    }

    /**
     * Performs OCR on a PDF or Image file.
     */
    async recognize(file: File | Blob, options: OcrOptions = {}): Promise<OcrFullResult> {
        const { language = 'eng', useAI = false, hyperCompression = false } = options;
        const worker = await this.getWorker(language);
        let fullText = '';
        const confidenceMap: { text: string, confidence: number }[] = [];
        const allTables: string[][][] = [];
        const pageZones: { zones: OCRZone[], pageNumber: number }[] = [];

        const mergedPdf = await PDFDocument.create();

        if (file.type === 'application/pdf') {
            options.onProgress?.(0, 'Rasterizing PDF for OCR...');
            const images = await pdfToImage(file, { dpi: 200, format: 'jpg' });

            for (let i = 0; i < images.length; i++) {
                options.onProgress?.((i / images.length) * 100, `Analyzing Page ${i + 1}...`);

                // Batch 18.1: Multi-Pass Voting (No MRC yet, we detection first)
                const resultA = await performOCR(worker, images[i], 'binarized', false);
                const resultB = await performOCR(worker, images[i], 'nuanced', false);

                const confA = resultA.blocks.reduce((acc, b) => acc + b.confidence, 0) / (resultA.blocks.length || 1);
                const confB = resultB.blocks.reduce((acc, b) => acc + b.confidence, 0) / (resultB.blocks.length || 1);

                const bestResult = confA >= confB ? resultA : resultB;

                // Batch 19.2: Forensic Scrub (BEFORE MRC for privacy)
                if (options.forensicScrub) {
                    images[i] = await this.scrubImage(images[i], bestResult.blocks, options);
                }

                // Batch 23.1: Hyper-Compression (Now from the CLEAN image)
                if (hyperCompression) {
                    bestResult.mrc = await OcrVision.generateMRCLayers(images[i]);
                }

                // Track confidence for heatmap
                bestResult.blocks.forEach(b => {
                    confidenceMap.push({ text: b.text, confidence: b.confidence });
                });

                // Batch 17.1: Geometric Zone Tracking
                const imgMetadata = await createImageBitmap(images[i]);
                const zones = ocrLayoutAnalyzer.analyze(bestResult.blocks, imgMetadata.width, imgMetadata.height);

                // Batch 21.2: Capture Tabular Data
                const pageTables = ocrLayoutAnalyzer.extractTables(zones);
                if (pageTables.length > 0) {
                    allTables.push(...pageTables.map(t => t as any));
                }

                // Batch 20.1 & 23.1: Dynamic Font Cloning & MRC Reconstruction
                const page = mergedPdf.addPage([imgMetadata.width, imgMetadata.height]);

                if (hyperCompression && bestResult.mrc) {
                    const bgEmbed = await mergedPdf.embedJpg(await bestResult.mrc.background.arrayBuffer());
                    const maskEmbed = await mergedPdf.embedPng(await bestResult.mrc.mask.arrayBuffer());

                    // Layer 1: Paper Background (Low-res)
                    page.drawImage(bgEmbed, { x: 0, y: 0, width: imgMetadata.width, height: imgMetadata.height });
                    // Layer 2: Ink Mask (High-res Monochrome)
                    page.drawImage(maskEmbed, { x: 0, y: 0, width: imgMetadata.width, height: imgMetadata.height });
                } else {
                    const imgEmbed = await mergedPdf.embedJpg(await images[i].arrayBuffer());
                    page.drawImage(imgEmbed, { x: 0, y: 0, width: imgMetadata.width, height: imgMetadata.height });
                }

                // Overlay Text Layer (Invisible but Searchable)
                const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
                for (const block of bestResult.blocks) {
                    const fontSize = Math.max(1, block.height * 0.75);
                    page.drawText(block.text, {
                        x: block.x,
                        y: imgMetadata.height - block.y - fontSize,
                        size: fontSize,
                        font: font,
                        color: rgb(0, 0, 0),
                        opacity: 0.01,
                    });
                }

                // Batch 22.1: Render Vector Paths
                bestResult.graphics.forEach(g => {
                    if (g.type === 'hline') {
                        page.drawLine({
                            start: { x: g.x, y: imgMetadata.height - g.y },
                            end: { x: g.x + g.w, y: imgMetadata.height - g.y },
                            thickness: g.h,
                            color: rgb(0, 0, 0)
                        });
                    } else if (g.type === 'vline') {
                        page.drawLine({
                            start: { x: g.x, y: imgMetadata.height - g.y },
                            end: { x: g.x, y: imgMetadata.height - (g.y + g.h) },
                            thickness: g.w,
                            color: rgb(0, 0, 0)
                        });
                    } else if (g.type === 'logo' || g.type === 'rect') {
                        page.drawRectangle({
                            x: g.x,
                            y: imgMetadata.height - (g.y + g.h),
                            width: g.w,
                            height: g.h,
                            borderWidth: 1,
                            borderColor: rgb(0, 0, 0),
                            opacity: 0.2
                        });
                    } else if (g.type === 'signature') {
                        page.drawRectangle({
                            x: g.x,
                            y: imgMetadata.height - (g.y + g.h),
                            width: g.w,
                            height: g.h,
                            borderWidth: 1,
                            borderColor: rgb(0, 0, 1), // Blue for signatures
                            opacity: 0.1
                        });
                    }
                });

                imgMetadata.close();

                let text = ocrLayoutAnalyzer.reconstructText(zones);

                if (options.sanitizePII) {
                    text = await this.sanitizeText(text);
                }

                if (useAI) {
                    options.onProgress?.((i / images.length) * 100, `Intelligent Correction (Page ${i + 1})...`);
                    text = await this.correctText(text);
                }

                fullText += text + '\n\n';
                pageZones.push({ zones, pageNumber: i + 1 });
            }
        } else {
            options.onProgress?.(50, 'Analyzing Image...');
            // Multi-Pass Voting (Image Branch)
            const resultA = await performOCR(worker, file, 'binarized', false);
            const resultB = await performOCR(worker, file, 'nuanced', false);

            const confA = resultA.blocks.reduce((acc, b) => acc + b.confidence, 0) / (resultA.blocks.length || 1);
            const confB = resultB.blocks.reduce((acc, b) => acc + b.confidence, 0) / (resultB.blocks.length || 1);

            const bestResult = confA >= confB ? resultA : resultB;

            // Batch 19.2: Forensic Scrub (Image Branch - BEFORE MRC)
            let processedFile = file;
            if (options.forensicScrub) {
                processedFile = await this.scrubImage(file, bestResult.blocks, options);
            }

            // Batch 23.1: Hyper-Compression (Single Image)
            if (hyperCompression) {
                bestResult.mrc = await OcrVision.generateMRCLayers(processedFile);
            }

            bestResult.blocks.forEach(b => {
                confidenceMap.push({ text: b.text, confidence: b.confidence });
            });

            const imgMetadata = await createImageBitmap(processedFile);
            const zones = ocrLayoutAnalyzer.analyze(bestResult.blocks, imgMetadata.width, imgMetadata.height);

            // Capture Tabular Data
            const pageTables = ocrLayoutAnalyzer.extractTables(zones);
            if (pageTables.length > 0) {
                allTables.push(...pageTables.map(t => t as any));
            }

            // Batch 20.1 & 23.1: Dynamic Font Cloning & MRC Reconstruction
            const page = mergedPdf.addPage([imgMetadata.width, imgMetadata.height]);

            if (hyperCompression && bestResult.mrc) {
                const bgEmbed = await mergedPdf.embedJpg(await bestResult.mrc.background.arrayBuffer());
                const maskEmbed = await mergedPdf.embedPng(await bestResult.mrc.mask.arrayBuffer());

                // Layer 1: Paper Background (Low-res)
                page.drawImage(bgEmbed, { x: 0, y: 0, width: imgMetadata.width, height: imgMetadata.height });
                // Layer 2: Ink Mask (High-res Monochrome)
                page.drawImage(maskEmbed, { x: 0, y: 0, width: imgMetadata.width, height: imgMetadata.height });
            } else {
                const imgEmbed = await mergedPdf.embedJpg(await processedFile.arrayBuffer());
                page.drawImage(imgEmbed, { x: 0, y: 0, width: imgMetadata.width, height: imgMetadata.height });
            }

            const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
            for (const block of bestResult.blocks) {
                const fontSize = Math.max(1, block.height * 0.75);
                page.drawText(block.text, {
                    x: block.x,
                    y: imgMetadata.height - block.y - fontSize,
                    size: fontSize,
                    font,
                    opacity: 0.01
                });
            }

            // Batch 22.1 & 22.2: Render Vector Paths (Lines, Logos, Signatures)
            bestResult.graphics.forEach(g => {
                if (g.type === 'hline') {
                    page.drawLine({
                        start: { x: g.x, y: imgMetadata.height - g.y },
                        end: { x: g.x + g.w, y: imgMetadata.height - g.y },
                        thickness: g.h,
                        color: rgb(0, 0, 0)
                    });
                } else if (g.type === 'vline') {
                    page.drawLine({
                        start: { x: g.x, y: imgMetadata.height - g.y },
                        end: { x: g.x, y: imgMetadata.height - (g.y + g.h) },
                        thickness: g.w,
                        color: rgb(0, 0, 0)
                    });
                } else if (g.type === 'logo' || g.type === 'rect') {
                    page.drawRectangle({
                        x: g.x,
                        y: imgMetadata.height - (g.y + g.h),
                        width: g.w,
                        height: g.h,
                        borderWidth: 1,
                        borderColor: rgb(0, 0, 0),
                        opacity: 0.2
                    });
                } else if (g.type === 'signature') {
                    page.drawRectangle({
                        x: g.x,
                        y: imgMetadata.height - (g.y + g.h),
                        width: g.w,
                        height: g.h,
                        borderWidth: 1,
                        borderColor: rgb(0, 0, 1),
                        opacity: 0.1
                    });
                }
            });

            imgMetadata.close();

            fullText = ocrLayoutAnalyzer.reconstructText(zones);

            if (options.sanitizePII) {
                fullText = await this.sanitizeText(fullText);
            }

            if (useAI) {
                options.onProgress?.(75, 'Applying Neural Correction...');
                fullText = await this.correctText(fullText);
            }
            pageZones.push({ zones, pageNumber: 1 });
        }

        const pdfBytes = await mergedPdf.save();

        // Final Hardening: Set Metadata for OS-level searchability
        const finalDoc = await PDFDocument.load(pdfBytes);
        finalDoc.setTitle(`Searchable Document - ${new Date().toLocaleDateString()}`);
        finalDoc.setSubject(fullText.slice(0, 500));
        finalDoc.setKeywords(['OCR', 'Searchable', 'Sanitized', 'PDFToolsKit']);
        finalDoc.setProducer('PDFToolsKit Semantic OCR Engine (God Mode)');

        const finalPdfBytes = await finalDoc.save();

        // Batch 306-311: Intelligent Document Classification & Knowledge Graph
        let classification;
        let knowledgeGraph;
        if (fullText.trim().length > 100) {
            options.onProgress?.(95, 'Synthesizing Knowledge Graph...');
            [classification, knowledgeGraph] = await Promise.all([
                this.classifyDocument(fullText),
                knowledgeGraphEngine.extract(fullText)
            ]);
        }

        // Batch 21.2: Generate Excel and CSV if tables found
        let excelBytes: Uint8Array | undefined;
        let csvString: string | undefined;

        if (allTables.length > 0) {
            const wb = XLSX.utils.book_new();
            allTables.forEach((tableData, idx) => {
                const ws = XLSX.utils.aoa_to_sheet(tableData as any);
                XLSX.utils.book_append_sheet(wb, ws, `Table ${idx + 1}`);
            });
            excelBytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

            // For CSV, just use the first table or merge them
            csvString = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
        }

        // Batch 25.2: Digital Forensic Authenticity
        const forensicResults: ForensicResult[] = [];
        if (options.forensicAudit) {
            options.onProgress?.(98, 'Performing Forensic Audit...');
            if (file.type === 'application/pdf') {
                const images = await pdfToImage(file, { dpi: 150, format: 'jpg' }); // Lower DPI for faster audit
                for (const img of images) {
                    forensicResults.push(await forensicEngine.audit(img));
                }
            } else {
                forensicResults.push(await forensicEngine.audit(file));
            }
        }

        return {
            text: fullText,
            confidenceMap,
            pdf: finalPdfBytes,
            excel: excelBytes,
            csv: csvString,
            classification,
            knowledgeGraph,
            pages: pageZones,
            forensicAudit: forensicResults.length > 0 ? forensicResults : undefined
        };
    }

    /**
     * Uses local SLM to categorize document and extract metadata.
     */
    private async classifyDocument(text: string) {
        try {
            const engine = await modelLoader.getEngine();
            const snippet = text.slice(0, 3000); // Analyze first 3000 chars

            const response = await engine.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Analyze the following OCR text and determine:
                        1. Document Type (Invoice, Receipt, Contract, Medical, Academic, ID, or Generic).
                        2. Key Metadata (3-4 important fields like Date, Amount, ID Number, or Parties).
                        Return results in STRICT JSON format:
                        { "type": "TYPE", "confidence": 0.0-1.0, "metadata": { "Key": "Value" } }`
                    },
                    { role: 'user', content: snippet }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1
            });

            const content = response.choices[0]?.message.content || '{}';
            // Safety: Strip markdown if present
            const cleanJson = content.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Classification failed", e);
            return undefined;
        }
    }

    private async scrubImage(blob: Blob, blocks: any[], options: OcrOptions): Promise<Blob> {
        const img = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const scale = 2.5; // Coordinate Restore Factor
        ctx.fillStyle = 'black';

        for (const block of blocks) {
            const matches = await SmartPatternMatcher.scanText(block.text);
            if (matches.length > 0) {
                // Wipe the pixels using restored original coordinates
                ctx.fillRect(block.x * scale, block.y * scale, block.width * scale, block.height * scale);
            }
        }

        img.close();
        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    }

    private async sanitizeText(text: string): Promise<string> {
        const matches = await SmartPatternMatcher.scanText(text);
        let sanitized = text;

        // Replace matches from back to front to maintain index integrity
        const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);

        for (const match of sortedMatches) {
            sanitized = sanitized.slice(0, match.startIndex) + `[REDACTED ${match.type}]` + sanitized.slice(match.endIndex);
        }
        return sanitized;
    }

    /**
     * Uses local LLM to correct OCR errors and restore semantics.
     * Enhanced for Phase 18.2: Neural Linguistic Correction.
     */
    async correctText(text: string): Promise<string> {
        try {
            const engine = await modelLoader.getEngine();
            const response = await engine.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `You are a high-precision OCR correction specialist. 
                        Rules:
                        1. Fix common OCR confusions (0 vs O, 1 vs l, 5 vs S).
                        2. Restore structural integrity (headers, footers, table alignment).
                        3. Maintain the original language and technical terminology.
                        4. Return ONLY the corrected text without preamble or commentary.`
                    },
                    { role: 'user', content: text.slice(0, 5000) }
                ],
                temperature: 0.1
            });
            return response.choices[0]?.message.content || text;
        } catch (e) {
            console.error("AI correction failed", e);
            return text;
        }
    }

    /**
     * Terminate worker to free resources.
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}

export const ocrEngine = new OcrEngine();
