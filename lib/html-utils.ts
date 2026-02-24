/**
 * Convert HTML content to PDF
 * Renders the provided HTML string into a container, captures it, and saves as PDF
 */
export interface PdfOptions {
    format: 'a4' | 'letter';
    orientation: 'portrait' | 'landscape';
}

/**
 * Convert HTML content to PDF - DEPRECATED: Use Apex Engine for high-fidelity conversion.
 * Stubbed to remove legacy dependencies (jsPDF, html2canvas).
 */
export async function htmlToPdf(_htmlContent: string, _options: PdfOptions = { format: 'a4', orientation: 'portrait' }): Promise<Uint8Array> {
    console.warn('htmlToPdf legacy engine removed. Migrate to Apex Engine WASM.');
    throw new Error('Conversion feature currently undergoing migration to Apex WASM Engine.');
}
