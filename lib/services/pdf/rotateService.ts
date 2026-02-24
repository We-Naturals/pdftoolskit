
import { PDFDocument, degrees } from 'pdf-lib';

export interface RotateOptions {
    rotations?: Record<number, number>; // pageIndex -> angle (90, 180, 270)
    fineRotations?: Record<number, number>; // pageIndex -> angle (float)
    defaultRotation?: number; // Apply to all pages if not specified in rotations
    mirrorMode?: boolean;
}

export class RotateService {
    static async rotate(file: File, options: RotateOptions): Promise<Blob> {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        // const pageCount = pages.length;

        // Apply Mirror Mode logic (pre-calculation) if it was just a boolean flag in UI
        // In the service, we expect specific rotations. 
        // If the UI passed `mirrorMode: true`, we should calculate it here or expect the UI to have passed the explicit rotations.
        // For robustness, let's respect explicit `rotations` first.

        pages.forEach((page, index) => {
            // eslint-disable-next-line security/detect-object-injection
            const rot = (options.rotations && options.rotations[index]) || options.defaultRotation || 0;
            // eslint-disable-next-line security/detect-object-injection
            const fineRot = options.fineRotations ? (options.fineRotations[index] || 0) : 0;

            // Cardinal flag rotation (lossless)
            if (rot !== 0) {
                const current = page.getRotation().angle;
                page.setRotation(degrees((current + rot) % 360));
            }

            // Fine-tune leveling (sub-degree)
            if (fineRot !== 0) {
                const { width, height } = page.getSize();
                const rad = (fineRot * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                // Move to center, rotate, move back
                const tx = (1 - cos) * (width / 2) + sin * (height / 2);
                const ty = -sin * (width / 2) + (1 - cos) * (height / 2);

                page.pushOperators(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    { op: 'q', args: [] } as any, // Save state
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    { op: 'cm', args: [cos, sin, -sin, cos, tx, ty] } as any // Rotate matrix
                );
            }
        });

        const savedBytes = await pdfDoc.save();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Blob([savedBytes as any], { type: 'application/pdf' });
    }
}
