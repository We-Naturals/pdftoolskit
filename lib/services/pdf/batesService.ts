
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface BatesOptions {
    prefix: string;
    startNumber: number;
    digits: number; // e.g., 6 for 000001
    position: 'TL' | 'TR' | 'BL' | 'BR';
    fontSize?: number;
    color?: string; // Hex
}

export class BatesService {
    static async stamp(file: File, options: BatesOptions): Promise<Blob> {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        const { prefix, startNumber, digits, position, fontSize = 10 } = options;
        const color = options.color ? this.hexToRgb(options.color) : rgb(0, 0, 0);

        pages.forEach((page, index) => {
            const currentNum = startNumber + index;
            const numStr = currentNum.toString().padStart(digits, '0');
            const text = `${prefix}${numStr}`;

            const { width, height } = page.getSize();
            const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
            const textHeight = helveticaFont.heightAtSize(fontSize);

            const margin = 20;
            let x = 0;
            let y = 0;

            switch (position) {
                case 'TL':
                    x = margin;
                    y = height - margin - textHeight;
                    break;
                case 'TR':
                    x = width - margin - textWidth;
                    y = height - margin - textHeight;
                    break;
                case 'BL':
                    x = margin;
                    y = margin;
                    break;
                case 'BR':
                    x = width - margin - textWidth;
                    y = margin;
                    break;
            }

            page.drawText(text, {
                x,
                y,
                size: fontSize,
                font: helveticaFont,
                color,
            });
        });

        const stampedBytes = await pdfDoc.save();
        return new Blob([new Uint8Array(stampedBytes)], { type: 'application/pdf' });
    }

    private static hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? rgb(
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255
            )
            : rgb(0, 0, 0);
    }
}
