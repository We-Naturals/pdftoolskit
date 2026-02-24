/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable security/detect-object-injection */

import { PDFDocument } from 'pdf-lib';
import {
    getGlobalPDFLib,
    ensurePDFDoc
} from './services/pdf/core';

export type WorkflowAction =
    | 'watermark'
    | 'pageNumbers'
    | 'protect'
    | 'unlock'
    | 'compress'
    | 'rotate'
    | 'flatten'
    | 'merge'
    | 'reorder'
    | 'metadata'
    | 'extract'
    | 'split'
    | 'pdfToImage'
    | 'imageToPdf'
    | 'pdfToWord'
    | 'pdfToExcel'
    | 'ocr'
    | 'ocrSearchable'
    | 'pdfA';

export interface WorkflowStep {
    id: string;
    action: WorkflowAction;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: Record<string, any>;
}

export interface WorkflowResult {
    data: Uint8Array | Blob | Blob[];
    type: string;
    logs: string[];
}

import { pdfToImage } from './engines/pdf-to-image';
import { imageToPdf } from './engines/image-to-pdf';
import { pdfToDocx } from './engines/pdf-to-docx';
import { pdfToExcel } from './engines/pdf-to-excel';
import { ocrEngine } from './engines/ocr-engine';
import { createSearchablePdf } from './engines/searchable-pdf';
import { convertToPdfA } from './engines/pdf-a';

import {
    rotatePDF,
    flattenPDF,
    protectPDF,
    unlockPDF,
    addWatermark,
    addPageNumbers,
    compressPDF,
    organizePDF,
    extractPages
} from './pdf-utils';

export class WorkflowEngine {
    private logs: string[] = [];

    private log(message: string) {
        this.logs.push(`[${new Date().toISOString()}] ${message}`);
    }

    async execute(file: File, steps: WorkflowStep[]): Promise<WorkflowResult> {
        this.logs = [];
        this.log(`Starting workflow with ${steps.length} steps (Warm Buffer Active).`);

        const PDFLib = await getGlobalPDFLib();
        let currentDoc: PDFDocument = await ensurePDFDoc(file);
        const currentFilename = file.name;

        for (let index = 0; index < steps.length; index++) {
            const step = steps[index];
            this.log(`Step ${index + 1}: Executing ${step.action}...`);

            try {
                switch (step.action) {
                    case 'watermark':
                        currentDoc = (await addWatermark(currentDoc, step.params.text as string, step.params.options as any)) as unknown as PDFDocument;
                        break;
                    case 'pageNumbers':
                        currentDoc = (await addPageNumbers(currentDoc, {
                            position: step.params.location as any,
                            startFrom: step.params.startNumber as number,
                            textPattern: step.params.textPattern as string,
                            margin: step.params.margin as number,
                            mirror: step.params.mirror as boolean
                        })) as unknown as PDFDocument;
                        break;
                    case 'rotate':
                        currentDoc = (await rotatePDF(currentDoc, step.params.rotation as 90 | 180 | 270)) as unknown as PDFDocument;
                        break;
                    case 'compress':
                        currentDoc = (await compressPDF(currentDoc, step.params.quality as any)) as unknown as PDFDocument;
                        break;
                    case 'protect':
                        currentDoc = (await protectPDF(currentDoc, {
                            userPassword: step.params.password as string,
                            ...(step.params.settings as any)
                        })) as unknown as PDFDocument;
                        break;
                    case 'unlock':
                        currentDoc = (await unlockPDF(currentDoc, step.params.password as string)) as unknown as PDFDocument;
                        break;
                    case 'flatten':
                        currentDoc = (await flattenPDF(currentDoc, step.params.options as any)) as unknown as PDFDocument;
                        break;
                    case 'pdfToImage': {
                        const bytes = await currentDoc.save();
                        const tempFile = new File([bytes as any], currentFilename, { type: 'application/pdf' });
                        const blobs = await pdfToImage(tempFile, step.params);
                        return { data: blobs, type: `image/${step.params.format || 'jpeg'}`, logs: this.logs };
                    }
                    case 'imageToPdf': {
                        const bytes = await currentDoc.save();
                        const tempFile = new File([bytes as any], currentFilename, { type: 'application/pdf' });
                        const resultBytes = await imageToPdf([tempFile], step.params);
                        currentDoc = await PDFLib.PDFDocument.load(resultBytes);
                        break;
                    }
                    case 'pdfToWord': {
                        const bytes = await currentDoc.save();
                        const tempFile = new File([bytes as any], currentFilename, { type: 'application/pdf' });
                        const blob = await pdfToDocx(tempFile);
                        return { data: blob, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', logs: this.logs };
                    }
                    case 'pdfToExcel': {
                        const bytes = await currentDoc.save();
                        const tempFile = new File([bytes as any], currentFilename, { type: 'application/pdf' });
                        const blob = await pdfToExcel(tempFile);
                        return { data: blob, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', logs: this.logs };
                    }
                    case 'ocr': {
                        const bytes = await currentDoc.save();
                        const tempFile = new File([bytes as any], currentFilename, { type: 'application/pdf' });
                        const text = await ocrEngine.recognize(tempFile, step.params);
                        const blob = new Blob([text.text], { type: 'text/plain' });
                        return { data: blob, type: 'text/plain', logs: this.logs };
                    }
                    case 'ocrSearchable': {
                        const bytes = await currentDoc.save();
                        const tempFile = new File([bytes as any], currentFilename, { type: 'application/pdf' });
                        const resultBytes = await createSearchablePdf(tempFile, step.params);
                        currentDoc = await PDFLib.PDFDocument.load(resultBytes);
                        break;
                    }
                    case 'pdfA': {
                        const bytes = await currentDoc.save();
                        const tempFile = new File([bytes as any], currentFilename, { type: 'application/pdf' });
                        const resultBytes = await convertToPdfA(tempFile, step.params as any);
                        currentDoc = await PDFLib.PDFDocument.load(resultBytes);
                        break;
                    }
                    case 'reorder':
                        currentDoc = (await organizePDF(currentDoc as any, step.params.pages as any)) as unknown as PDFDocument;
                        break;
                    case 'extract':
                        currentDoc = (await extractPages(currentDoc as any, step.params.pageRange as string)) as unknown as PDFDocument;
                        break;
                    default:
                        this.log(`Action ${step.action} is not yet optimized or implemented in the engine.`);
                }
            } catch (error: unknown) {
                this.log(`Error in step ${step.action}: ${error}`);
                throw new Error(`Error in step ${step.action}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        const finalBytes = await currentDoc.save();
        this.log('Workflow completed successfully.');
        return { data: finalBytes, type: 'application/pdf', logs: this.logs };
    }
}

export const workflowEngine = new WorkflowEngine();

export async function executeWorkflow(
    files: File[],
    steps: WorkflowStep[],
    onProgress?: (current: number, total: number, status: string) => void
): Promise<File[]> {
    const results: File[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
        const file = files[i];
        if (onProgress) onProgress(i, total, `Processing ${file.name}...`);

        try {
            const result = await workflowEngine.execute(file, steps);
            if (Array.isArray(result.data)) {
                const files = result.data.map((blob, idx) =>
                    new File([blob as any], `${file.name}_page_${idx + 1}.${result.type.split('/')[1]}`, { type: result.type })
                );
                results.push(...files);
            } else {
                const processedFile = new File([result.data as BlobPart], file.name, { type: result.type, lastModified: Date.now() });
                results.push(processedFile);
            }
        } catch (error) {
            console.error(`Failed to process file ${file.name}:`, error);
            throw error;
        }
    }

    if (onProgress) onProgress(total, total, 'Completed');
    return results;
}
