
import { PDFDocument, PageSizes } from 'pdf-lib';

export interface ImageToPdfOptions {
    pageSize?: 'A4' | 'LETTER' | 'ORIGINAL';
    orientation?: 'P' | 'L' | 'AUTO';
    margin?: number;
}

/**
 * Intelligent Image to PDF conversion using pdf-lib.
 * Handles JPG, PNG, and potentially GIF/BMP if browser supports.
 */
export async function imageToPdf(
    files: (File | Blob)[],
    options: ImageToPdfOptions = {}
): Promise<Uint8Array> {
    const { pageSize = 'A4', orientation = 'AUTO', margin = 0 } = options;
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        let image;

        // Detect type and embed
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            image = await pdfDoc.embedJpg(arrayBuffer);
        } else if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(arrayBuffer);
        } else {
            // Fallback: try to embed as JPG if type is unknown but might be an image
            try {
                image = await pdfDoc.embedJpg(arrayBuffer);
            } catch (_e) {
                console.error(`Unsupported image type: ${file.type}`);
                continue;
            }
        }

        const { width, height } = image.scale(1);

        // Determine Page Size and Orientation
        let pageW = width;
        let pageH = height;

        if (pageSize === 'A4') {
            [pageW, pageH] = PageSizes.A4;
        } else if (pageSize === 'LETTER') {
            [pageW, pageH] = PageSizes.Letter;
        }

        // Auto Orientation logic
        if (orientation === 'AUTO') {
            if (width > height && pageW < pageH) {
                // Swap for landscape
                [pageW, pageH] = [pageH, pageW];
            }
        } else if (orientation === 'L' && pageW < pageH) {
            [pageW, pageH] = [pageH, pageW];
        } else if (orientation === 'P' && pageW > pageH) {
            [pageW, pageH] = [pageH, pageW];
        }

        const page = pdfDoc.addPage([pageW, pageH]);

        // Calculate Scale to Fit
        const availableW = pageW - (margin * 2);
        const availableH = pageH - (margin * 2);

        const scale = Math.min(availableW / width, availableH / height);
        const scaledW = width * scale;
        const scaledH = height * scale;

        // Center on page
        const x = (pageW - scaledW) / 2;
        const y = (pageH - scaledH) / 2;

        page.drawImage(image, {
            x,
            y,
            width: scaledW,
            height: scaledH,
        });
    }

    return await pdfDoc.save();
}
