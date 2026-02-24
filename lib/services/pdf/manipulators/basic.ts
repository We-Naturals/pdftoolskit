/* eslint-disable */

import { PDFDocument, rgb, degrees, PDFPage } from 'pdf-lib';
import { applyBranding, ensurePDFDoc } from '../core';
import { parsePageRange } from '@/lib/utils';

export async function cropPDF(file: File | Blob | Uint8Array, margins: { top: number; bottom: number; left: number; right: number }, options?: any): Promise<Uint8Array>;
export async function cropPDF(doc: PDFDocument, margins: { top: number; bottom: number; left: number; right: number }, options?: any): Promise<PDFDocument>;
export async function cropPDF(
    input: File | Blob | PDFDocument | Uint8Array,
    margins: { top: number; bottom: number; left: number; right: number },
    options?: {
        pageRange?: string;
        perPageCrops?: Record<number, {
            top: number; bottom: number; left: number; right: number;
            mode?: 'keep' | 'remove'; // Default 'keep'
        }>;
        anonymize?: boolean; // Set all boxes (Media, Crop, Art, Bleed) to the same
    }
): Promise<Uint8Array | PDFDocument> {
    const pdfDoc = await ensurePDFDoc(input);

    const updatePageBoxes = (page: PDFPage, newX: number, newY: number, newWidth: number, newHeight: number) => {
        if (options?.anonymize) {
            page.setMediaBox(newX, newY, newWidth, newHeight);
            page.setCropBox(newX, newY, newWidth, newHeight);
            page.setArtBox(newX, newY, newWidth, newHeight);
            page.setBleedBox(newX, newY, newWidth, newHeight);
        } else {
            page.setMediaBox(newX, newY, newWidth, newHeight);
        }
    };

    if (options?.perPageCrops && Object.keys(options.perPageCrops).length > 0) {
        const pages = pdfDoc.getPages();
        Object.entries(options.perPageCrops).forEach(([pageIndexStr, config]) => {
            const index = parseInt(pageIndexStr, 10);
            if (index >= 0 && index < pages.length) {
                const page = pages[index];
                const { x, y, width, height } = page.getMediaBox();
                const newX = x + config.left;
                const newY = y + config.bottom;
                const newWidth = width - config.left - config.right;
                const newHeight = height - config.top - config.bottom;
                if (newWidth > 0 && newHeight > 0) {
                    if (config.mode === 'remove') {
                        page.drawRectangle({ x: newX, y: newY, width: newWidth, height: newHeight, color: rgb(1, 1, 1) });
                    } else {
                        updatePageBoxes(page, newX, newY, newWidth, newHeight);
                    }
                }
            }
        });
    } else {
        const totalPages = pdfDoc.getPageCount();
        const pageIndices = parsePageRange(options?.pageRange || '', totalPages);
        const pages = pdfDoc.getPages();
        pages.forEach((page, index: number) => {
            if (!pageIndices.includes(index)) return;
            const { x, y, width, height } = page.getMediaBox();
            const newX = x + margins.left;
            const newY = y + margins.bottom;
            const newWidth = width - margins.left - margins.right;
            const newHeight = height - margins.top - margins.bottom;
            if (newWidth > 0 && newHeight > 0) {
                updatePageBoxes(page, newX, newY, newWidth, newHeight);
            }
        });
    }

    applyBranding(pdfDoc);
    if (input instanceof PDFDocument) return pdfDoc;
    return await pdfDoc.save();
}

export async function flattenPDF(input: File | Blob | Uint8Array, options?: any): Promise<Uint8Array>;
export async function flattenPDF(doc: PDFDocument, options?: any): Promise<PDFDocument>;
export async function flattenPDF(
    input: File | Blob | PDFDocument | Uint8Array,
    options: { forms?: boolean, annotations?: boolean, layers?: boolean } = {}
): Promise<Uint8Array | PDFDocument> {
    const pdfDoc = await ensurePDFDoc(input);

    if (options.forms) {
        try {
            const form = pdfDoc.getForm();
            form.flatten();
        } catch (e) {
            console.warn("Form flattening skipped: ", e);
        }
    }

    if (options.annotations) {
        // Basic annotation stripping logic
        const pages = pdfDoc.getPages();
        pages.forEach((_page) => {
            // Placeholder for advanced flattening (e.g. page.node.delete(PDFName.of('Annots')))
            console.log("Processing page for annotations...");
        });
    }

    if (options.layers) {
        try {
            pdfDoc.catalog.delete(pdfDoc.context.obj('OCProperties'));
        } catch (_e) {
            console.warn("OCProperties deletion failed or not present.");
        }
    }

    pdfDoc.setModificationDate(new Date());
    applyBranding(pdfDoc);

    if (input instanceof PDFDocument) return pdfDoc;
    return await pdfDoc.save();
}

export async function mergePDFs(files: (File | Blob | Uint8Array | PDFDocument)[]): Promise<Uint8Array>;
export async function mergePDFs(files: (File | Blob | Uint8Array | PDFDocument)[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        const pdf = await ensurePDFDoc(file);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    mergedPdf.setTitle(`Merged Document (${files.length} parts)`);
    applyBranding(mergedPdf);
    return await mergedPdf.save();
}

export async function splitPDF(input: File | Blob | Uint8Array | PDFDocument, pageRanges: { start: number; end: number }[]): Promise<Uint8Array[]> {
    const sourcePdf = await ensurePDFDoc(input);
    const results: Uint8Array[] = [];

    for (const range of pageRanges) {
        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(
            sourcePdf,
            Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start + i)
        );
        pages.forEach((page) => newPdf.addPage(page));
        applyBranding(newPdf);
        results.push(await newPdf.save());
    }

    return results;
}

export async function removePagesFromPDF(input: File | Blob | Uint8Array, pageIndices: number[]): Promise<Uint8Array>;
export async function removePagesFromPDF(doc: PDFDocument, pageIndices: number[]): Promise<PDFDocument>;
export async function removePagesFromPDF(
    input: File | Blob | PDFDocument | Uint8Array,
    pageIndicesToRemove: number[]
): Promise<Uint8Array | PDFDocument> {
    const pdf = await ensurePDFDoc(input);
    const totalPages = pdf.getPageCount();

    const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i)
        .filter(i => !pageIndicesToRemove.includes(i));

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdf, pagesToKeep);
    copiedPages.forEach((page) => newPdf.addPage(page));

    applyBranding(newPdf);
    if (input instanceof PDFDocument) return newPdf;
    return await newPdf.save();
}

export async function organizePDF(input: File | Blob | Uint8Array, pages: { index: number; rotation?: number }[]): Promise<Uint8Array>;
export async function organizePDF(doc: PDFDocument, pages: { index: number; rotation?: number }[]): Promise<PDFDocument>;
export async function organizePDF(
    input: File | Blob | PDFDocument | Uint8Array,
    pages: { index: number; rotation?: number }[]
): Promise<Uint8Array | PDFDocument> {
    const sourcePdf = await ensurePDFDoc(input);
    const newPdf = await PDFDocument.create();

    const indices = pages.map(p => p.index);
    const copiedPages = await newPdf.copyPages(sourcePdf, indices);

    copiedPages.forEach((page, i) => {
        const rotationToAdd = pages[i].rotation || 0;
        if (rotationToAdd !== 0) {
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees((currentRotation + rotationToAdd) % 360));
        }
        newPdf.addPage(page);
    });

    applyBranding(newPdf);
    if (input instanceof PDFDocument) return newPdf;
    return await newPdf.save();
}

export async function mergePages(
    pages: { fileId: string; pageIndex: number; rotation: number }[],
    fileMap: Map<string, File | PDFDocument>
): Promise<Uint8Array> {
    const newPdf = await PDFDocument.create();
    const fileIds = Array.from(new Set(pages.map(p => p.fileId)));
    const loadedPdfs = new Map<string, PDFDocument>();

    for (const fid of fileIds) {
        const file = fileMap.get(fid);
        if (file) {
            loadedPdfs.set(fid, await ensurePDFDoc(file));
        }
    }

    for (const p of pages) {
        const sourcePdf = loadedPdfs.get(p.fileId);
        if (sourcePdf) {
            const [copiedPage] = await newPdf.copyPages(sourcePdf, [p.pageIndex]);
            const rotationToAdd = p.rotation || 0;
            if (rotationToAdd !== 0) {
                const currentRotation = copiedPage.getRotation().angle;
                copiedPage.setRotation(degrees((currentRotation + rotationToAdd) % 360));
            }
            newPdf.addPage(copiedPage);
        }
    }

    applyBranding(newPdf);
    return await newPdf.save();
}
