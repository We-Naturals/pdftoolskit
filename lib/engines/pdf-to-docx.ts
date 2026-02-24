
import { Document, Packer, Paragraph, TextRun, AlignmentType, ISectionOptions } from 'docx';
import { layoutAnalyzer } from '../analysis/layout-analyzer';
// import { PDFDocument } from 'pdf-lib';

/**
 * PDF to Word (DOCX) Reconstruction Engine.
 * Uses LayoutAnalyzer to map PDF content into structured Word paragraphs.
 */
export async function pdfToDocx(file: File | Blob): Promise<Blob> {
    const analysis = await layoutAnalyzer.analyze(file);
    // const existingPdf = await PDFDocument.load(arrayBuffer);
    // The pdfDoc variable was created but not used. Removing it as it's not needed for the current logic.
    const sections = analysis.pages.map(page => ({
        properties: {
            page: {
                size: {
                    width: `${page.width}pt`,
                    height: `${page.height}pt`,
                },
            },
        },
        children: page.blocks.map(block => {
            return new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                    new TextRun({
                        text: block.text,
                        size: block.fontSize * 2, // docx uses half-points
                        font: block.fontName || 'Arial',
                        bold: block.isHeading,
                    }),
                ],
                spacing: {
                    before: 200,
                    after: 200,
                },
            });
        }),
    }));

    const doc = new Document({
        sections: sections as ISectionOptions[],
    });

    return await Packer.toBlob(doc);
}
