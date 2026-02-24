
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ocrEngine } from './ocr-engine';
import { pdfToImage } from './pdf-to-image';

/**
 * Searchable PDF Maker (The Oracle's Masterpiece)
 * Injects an invisible text layer over scanned PDF pages.
 */
export async function createSearchablePdf(
    file: File | Blob,
    options: { language?: string } = {}
): Promise<Uint8Array> {
    const _arrayBuffer = await file.arrayBuffer();
    // const existingPdf = await PDFDocument.load(arrayBuffer);
    const pdfDoc = await PDFDocument.create();

    // We rasterize to ensure we have clear images for OCR
    const images = await pdfToImage(file, { dpi: 150, format: 'jpg' });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < images.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const imageBytes = await images[i].arrayBuffer();
        const image = await pdfDoc.embedJpg(imageBytes);
        const { width, height } = image.scale(1);

        const page = pdfDoc.addPage([width, height]);
        page.drawImage(image, { x: 0, y: 0, width, height });

        // Perform OCR to get spatial text data
        // Tesseract provides HOCR or TSV for positions, but for this MVP 
        // we'll use our ocrEngine to get lines and approximate placements.
        // In a full implementation, we'd use worker.getOCR('hocr')
        // eslint-disable-next-line security/detect-object-injection
        const text = await ocrEngine.recognize(images[i], { language: options.language });
        const lines = text.text.split('\n');

        // Inject invisible text
        lines.forEach((line: string, idx: number) => {
            if (!line.trim()) return;
            page.drawText(line, {
                x: 50, // Approximate
                y: height - 50 - (idx * 15), // Approximate
                size: 10,
                font,
                color: rgb(0, 0, 0),
                opacity: 0, // INVISIBLE LAYER
            });
        });
    }

    return await pdfDoc.save();
}
