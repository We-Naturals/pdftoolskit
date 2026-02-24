
import { PDFDocument } from 'pdf-lib';
import { editPDF, PDFModification } from '../lib/pdf-utils-edit';

async function verifyPhase2() {
    console.log("Starting Phase 2 Verification...");

    // 1. Create a dummy PDF
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 400]);
    page.drawText('This is a confidential document signed by User.', { x: 50, y: 350, size: 20 });
    const pdfBytes = await doc.save();
    const file = new File([pdfBytes as any], "test.pdf", { type: "application/pdf" });

    // 2. Define Modifications
    const mods: PDFModification[] = [
        // Bio-Sign
        {
            type: 'drawing',
            pageIndex: 0,
            x: 50,
            y: 100,
            width: 200,
            height: 50,
            pathPoints: [{ x: 50, y: 100 }, { x: 100, y: 150 }, { x: 200, y: 100 }],
            strokeColor: '#000000',
            strokeWidth: 2,
            biometricData: {
                created: Date.now(),
                points: 3,
                velocityFactor: 0.8,
                pressure: 0.5
            },
            fieldName: 'sig_test'
        },
        // True Sanitize (Redaction)
        {
            type: 'shape',
            shapeType: 'rectangle',
            pageIndex: 0,
            x: 50,
            y: 340, // Covering "confidential"
            width: 150,
            height: 30,
            isRedaction: true
        }
    ];

    // 3. Apply Edits
    console.log("Applying edits...");
    const editedPdfBytes = await editPDF(file, mods);
    console.log("Edits applied. Size:", editedPdfBytes.length);

    // 4. Verify Metadata
    const editedDoc = await PDFDocument.load(editedPdfBytes);
    const subject = editedDoc.getSubject();
    console.log("PDF Subject:", subject);

    if (subject && subject.includes('bioSignatures') && subject.includes('sig_test')) {
        console.log("SUCCESS: Bio-Sign metadata found.");
    } else {
        console.error("FAILURE: Bio-Sign metadata missing.");
        process.exit(1);
    }

    console.log("Verification Complete.");
}

// Polyfill File for Node.js environment if needed
if (typeof global.File === 'undefined') {
    global.File = class File extends Blob {
        name: string;
        lastModified: number;
        constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
            super(fileBits, options);
            this.name = fileName;
            this.lastModified = options?.lastModified || Date.now();
        }
    } as any;
}

verifyPhase2().catch(e => {
    console.error(e);
    process.exit(1);
});
