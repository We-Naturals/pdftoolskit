/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable security/detect-object-injection */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { applyBranding, ensurePDFDoc } from '../core';

export async function addPageNumbers(input: File | Blob | Uint8Array, options: { position: string; startFrom?: number; textPattern?: string; margin?: number; mirror?: boolean; fontSize?: number }): Promise<Uint8Array>;
export async function addPageNumbers(doc: PDFDocument, options: { position: string; startFrom?: number; textPattern?: string; margin?: number; mirror?: boolean; fontSize?: number }): Promise<PDFDocument>;
export async function addPageNumbers(
    input: File | Blob | PDFDocument | Uint8Array,
    options: {
        position: string;
        startFrom?: number;
        fontSize?: number;
        textPattern?: string; // e.g. "Page {n} of {total}"
        margin?: number;
        mirror?: boolean; // If true, swaps left/right on even pages
    }
): Promise<Uint8Array | PDFDocument> {
    const pdfDoc = await ensurePDFDoc(input);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const count = pages.length;

    const fontSize = options.fontSize || 12;
    const startNum = options.startFrom || 1;
    const pattern = options.textPattern || '{n}';
    const baseMargin = options.margin !== undefined ? options.margin : 20;

    for (let i = 0; i < count; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const pageNum = i + startNum;
        const text = pattern.replace('{n}', pageNum.toString()).replace('{total}', count.toString());

        const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
        const textHeight = helveticaFont.heightAtSize(fontSize);

        let x = 0, y = 0;
        let effectivePos = options.position;
        if (options.mirror && (i + 1) % 2 === 0) {
            if (effectivePos.includes('left')) effectivePos = effectivePos.replace('left', 'right') as any;
            else if (effectivePos.includes('right')) effectivePos = effectivePos.replace('right', 'left') as any;
        }

        switch (effectivePos) {
            case 'bottom-left': x = baseMargin; y = baseMargin; break;
            case 'bottom-center': x = (width / 2) - (textWidth / 2); y = baseMargin; break;
            case 'bottom-right': x = width - textWidth - baseMargin; y = baseMargin; break;
            case 'top-left': x = baseMargin; y = height - textHeight - baseMargin; break;
            case 'top-center': x = (width / 2) - (textWidth / 2); y = height - textHeight - baseMargin; break;
            case 'top-right': x = width - textWidth - baseMargin; y = height - textHeight - baseMargin; break;
        }

        page.drawText(text, { x, y, size: fontSize, font: helveticaFont, color: rgb(0, 0, 0) });
    }

    applyBranding(pdfDoc);
    if (input instanceof PDFDocument) return pdfDoc;
    return await pdfDoc.save();
}

export async function addWatermark(input: File | Blob | Uint8Array, text: string, options?: { opacity?: number; size?: number; color?: { r: number; g: number; b: number }; rotation?: number; layout?: 'single' | 'mosaic'; x?: number; y?: number }): Promise<Uint8Array>;
export async function addWatermark(doc: PDFDocument, text: string, options?: { opacity?: number; size?: number; color?: { r: number; g: number; b: number }; rotation?: number; layout?: 'single' | 'mosaic'; x?: number; y?: number }): Promise<PDFDocument>;
export async function addWatermark(
    input: File | Blob | PDFDocument | Uint8Array,
    watermarkText: string,
    options: {
        opacity?: number;
        size?: number;
        color?: { r: number; g: number; b: number };
        rotation?: number;
        layout?: 'single' | 'mosaic';
        x?: number; y?: number;
    } = {}
): Promise<Uint8Array | PDFDocument> {
    const pdfDoc = await ensurePDFDoc(input);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    const fontSize = options.size || 50;
    const opacity = options.opacity !== undefined ? options.opacity : 0.5;
    const color = options.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0.5, 0.5, 0.5);
    const rotation = options.rotation !== undefined ? options.rotation : 45;
    const layout = options.layout || 'single';

    for (const page of pages) {
        const { width, height } = page.getSize();
        const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = helveticaFont.heightAtSize(fontSize);

        if (layout === 'mosaic') {
            const hSpacing = textWidth * 2;
            const vSpacing = textHeight * 4;
            for (let y = -height; y < height * 2; y += vSpacing) {
                for (let x = -width; x < width * 2; x += hSpacing) {
                    page.drawText(watermarkText, { x, y, size: fontSize, font: helveticaFont, color, opacity, rotate: degrees(rotation) });
                }
            }
        } else {
            let targetX, targetY;
            if (options.x !== undefined && options.y !== undefined) {
                targetX = (width * options.x) - (textWidth / 2);
                targetY = (height - (height * options.y)) - (textHeight / 2);
            } else {
                targetX = (width / 2) - (textWidth / 2);
                targetY = (height / 2) - (textHeight / 2);
            }
            page.drawText(watermarkText, { x: targetX, y: targetY, size: fontSize, font: helveticaFont, color, opacity, rotate: degrees(rotation) });
        }
    }

    applyBranding(pdfDoc);
    if (input instanceof PDFDocument) return pdfDoc;
    return await pdfDoc.save();
}
