import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

/**
 * Centrally manages PDF.js initialization.
 * Ensures the worker is correctly configured for high-performance rendering.
 */
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // We use the local worker bundled in the public directory for speed and air-gapped support.
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export { pdfjsLib };
export default pdfjsLib;
