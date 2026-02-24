
import { PDFDocument, degrees, PDFPage } from 'pdf-lib';
import { applyBranding, ensurePDFDoc } from '../core';

export async function reversePDF(input: File | Blob | Uint8Array): Promise<Uint8Array>;
export async function reversePDF(doc: PDFDocument): Promise<PDFDocument>;
export async function reversePDF(input: File | Blob | PDFDocument | Uint8Array): Promise<Uint8Array | PDFDocument> {
    const sourcePdf = await ensurePDFDoc(input);
    const newPdf = await PDFDocument.create();

    const totalPages = sourcePdf.getPageCount();
    const reverseIndices = Array.from({ length: totalPages }, (_, i) => totalPages - 1 - i);

    const copiedPages = await newPdf.copyPages(sourcePdf, reverseIndices);
    copiedPages.forEach((page: PDFPage) => newPdf.addPage(page));

    applyBranding(newPdf);
    if (input instanceof PDFDocument) return newPdf;
    return await newPdf.save();
}

export async function extractPages(input: File | Blob | Uint8Array, pageRange: string): Promise<Uint8Array>;
export async function extractPages(doc: PDFDocument, pageRange: string): Promise<PDFDocument>;
export async function extractPages(input: File | Blob | PDFDocument | Uint8Array, pageRange: string): Promise<Uint8Array | PDFDocument> {
    const sourcePdf = await ensurePDFDoc(input);
    const newPdf = await PDFDocument.create();
    const totalPages = sourcePdf.getPageCount();

    const pageIndices = new Set<number>();
    const parts = pageRange.split(',').map(p => p.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    if (i >= 1 && i <= totalPages) pageIndices.add(i - 1);
                }
            }
        } else {
            const pageNum = parseInt(part);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                pageIndices.add(pageNum - 1);
            }
        }
    }

    const indices = Array.from(pageIndices).sort((a, b) => a - b);
    if (indices.length === 0) throw new Error("Invalid page range");

    const copiedPages = await newPdf.copyPages(sourcePdf, indices);
    copiedPages.forEach((page: PDFPage) => newPdf.addPage(page));

    applyBranding(newPdf);
    if (input instanceof PDFDocument) return newPdf;
    return await newPdf.save();
}

export async function rotatePDF(input: File | Blob | Uint8Array, rotation: 90 | 180 | 270): Promise<Uint8Array>;
export async function rotatePDF(doc: PDFDocument, rotation: 90 | 180 | 270): Promise<PDFDocument>;
export async function rotatePDF(input: File | Blob | PDFDocument | Uint8Array, rotation: 90 | 180 | 270): Promise<Uint8Array | PDFDocument> {
    const pdfDoc = await ensurePDFDoc(input);
    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + rotation) % 360));
    });

    applyBranding(pdfDoc);
    if (input instanceof PDFDocument) return pdfDoc;
    return await pdfDoc.save();
}
