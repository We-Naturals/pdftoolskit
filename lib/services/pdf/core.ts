/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFDocument, PDFString, PDFDict, PDFName, StandardFonts, rgb, degrees } from 'pdf-lib';

export function applyBranding(pdfDoc: PDFDocument) {
    pdfDoc.setModificationDate(new Date());
    const producer = PDFString.of('PDFToolskit');
    const creator = PDFString.of('PDFToolskit');

    const context = pdfDoc.context;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (context && (context as any).trailerInfo && (context as any).trailerInfo.Info) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const infoRef = (context as any).trailerInfo.Info;
        const info = context.lookup(infoRef);
        if (info instanceof PDFDict) {
            info.set(PDFName.of('Producer'), producer);
            info.set(PDFName.of('Creator'), creator);
            return;
        }
    }

    pdfDoc.setProducer('PDFToolskit Core Engine');
    pdfDoc.setCreator('PDFToolskit');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getGlobalPDFLib(): Promise<any> {
    return { PDFDocument, StandardFonts, rgb, degrees, PDFName, PDFString, PDFDict };
}
/**
 * Robustly extracts an ArrayBuffer from a File/Blob, providing full compatibility 
 * across environments (Browsers, Node.js, and Test JSDOM).
 */
export async function getFileArrayBuffer(file: File | Blob | ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
    if (file instanceof ArrayBuffer) return file;
    if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    if (typeof (file as any).arrayBuffer === 'function') {
        try {
            return await (file as any).arrayBuffer();
        } catch (_e) {
            // Fall through to fallback if it exists but fails
        }
    }

    // Fallback for environments lacking file.arrayBuffer (e.g. older JSDOM)
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('FileReader failed to read the file.'));
        reader.readAsArrayBuffer(file as File | Blob);
    });
}

/**
 * Ensures we have a loaded PDFDocument instance.
 * Supports "Warm Buffer" by returning the same instance if already loaded.
 */
export async function ensurePDFDoc(input: File | Blob | PDFDocument | Uint8Array | ArrayBuffer): Promise<PDFDocument> {
    if (input instanceof PDFDocument) {
        return input;
    }

    const buffer = (input instanceof Uint8Array || input instanceof ArrayBuffer) ? input : await getFileArrayBuffer(input);
    const PDFLib = await getGlobalPDFLib();
    return await PDFLib.PDFDocument.load(buffer);
}
