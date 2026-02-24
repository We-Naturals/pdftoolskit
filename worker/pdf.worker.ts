import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

// Minimal DOM polyfill for PDF.js environment detection in workers
if (typeof document === 'undefined') {
    (self as any).document = {
        createElement: (tag: string) => {
            if (tag === 'canvas') {
                const canvas = new OffscreenCanvas(300, 150);
                (canvas as any).style = {};
                return canvas;
            }
            const el: any = { style: {}, setAttribute: () => { }, append: () => { }, remove: () => { }, removeChild: () => { } };
            el.parentNode = el;
            return el;
        },
        createElementNS: (ns: string, tag: string) => {
            if (tag === 'canvas') {
                const canvas = new OffscreenCanvas(300, 150);
                (canvas as any).style = {};
                return canvas;
            }
            const el: any = { style: {}, setAttribute: () => { }, append: () => { }, remove: () => { }, removeChild: () => { } };
            el.parentNode = el;
            return el;
        },
        getElementsByTagName: () => [],
        documentElement: { style: {} },
        head: { append: () => { }, appendChild: () => { } },
        body: { append: () => { }, appendChild: () => { } },
        nodeType: 9,
    };
}

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Cache for loaded PDF Documents.
 * Key: Document ID (provided by main thread)
 * Value: PDFDocumentProxy
 */
const documentCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

self.onmessage = async (e: MessageEvent) => {
    const { type, id, file, url, pageNumber, scale, rotation } = e.data;

    try {
        switch (type) {
            case 'LOAD_DOCUMENT': {
                // Load and cache the document
                if (documentCache.has(id)) {
                    // Already loaded
                    (self as any).postMessage({ type: 'LOAD_SUCCESS', id, pageCount: documentCache.get(id)?.numPages });
                    return;
                }

                let loadingTask;
                if (file) {
                    // file is ArrayBuffer here
                    loadingTask = pdfjsLib.getDocument({
                        data: file,
                        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
                        cMapPacked: true,
                    });
                } else if (url) {
                    loadingTask = pdfjsLib.getDocument({
                        url,
                        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
                        cMapPacked: true,
                    });
                } else {
                    throw new Error('No file or URL provided for LOAD_DOCUMENT');
                }

                const pdf = await loadingTask.promise;
                documentCache.set(id, pdf);
                (self as any).postMessage({ type: 'LOAD_SUCCESS', id, pageCount: pdf.numPages });
                break;
            }

            case 'RENDER_PAGE': {
                const pdf = documentCache.get(id);
                if (!pdf) {
                    throw new Error(`Document ${id} not found. Call LOAD_DOCUMENT first.`);
                }

                const page = await pdf.getPage(pageNumber); // 1-based index
                const viewport = page.getViewport({ scale, rotation: rotation || 0 });
                // Create a fresh canvas for every render to avoid "Same Canvas" conflicts
                const canvas = new OffscreenCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;

                if (!context) throw new Error('Failed to get 2D context');

                await page.render({
                    canvasContext: context as any,
                    viewport,
                }).promise;

                const bitmap = canvas.transferToImageBitmap();

                // Cleanup page resources (but keep doc open)
                page.cleanup();

                (self as any).postMessage(
                    { type: 'RENDER_SUCCESS', id, pageNumber, bitmap },
                    [bitmap]
                );
                break;
            }

            case 'UNLOAD_DOCUMENT': {
                const pdf = documentCache.get(id);
                if (pdf) {
                    pdf.cleanup();
                    pdf.destroy();
                    documentCache.delete(id);
                }
                break;
            }

            // Legacy Support (for existing components)
            case 'RENDER_THUMBNAIL': {
                // Forward-compatible legacy handler could be added here if needed,
                // but for now I'm replacing the file content. 
                // If standard tools needed it, I should implement it.
                // IMPLEMENTATION:
                let pdf: pdfjsLib.PDFDocumentProxy;
                // Re-implement the one-off load for legacy calls
                if (file) {
                    const arrayBuffer = await file.arrayBuffer();
                    const task = pdfjsLib.getDocument({ data: arrayBuffer, cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`, cMapPacked: true });
                    pdf = await task.promise;
                } else if (url) {
                    const task = pdfjsLib.getDocument({ url, cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`, cMapPacked: true });
                    pdf = await task.promise;
                } else { throw new Error('No data'); }

                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale });
                const canvas = new OffscreenCanvas(viewport.width, viewport.height);
                const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
                await page.render({ canvasContext: ctx as any, viewport }).promise;
                const bitmap = canvas.transferToImageBitmap();
                page.cleanup();
                pdf.destroy();

                (self as any).postMessage(
                    { type: 'THUMBNAIL_SUCCESS', bitmap, pageNumber },
                    [bitmap]
                );
                break;
            }
        }

    } catch (error: any) {
        if (error?.name === 'PasswordException' || (error?.message && error.message.includes('password given'))) {
            (self as any).postMessage({ type: 'LOCKED', message: error.message, id });
        } else {
            console.error('Worker Error:', error);
            (self as any).postMessage({ type: 'ERROR', message: error.message, id });
        }
    }
};
