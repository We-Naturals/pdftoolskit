import { PDFDocument, degrees, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { addPageNumbers, addWatermark } from '../lib/services/pdf/manipulators/enrichment';
import { protectPDF, unlockPDF } from '../lib/services/pdf/security';
import { excelToPdf } from '../lib/services/pdf/converters/excelToPdf';
import { applyBranding } from '../lib/services/pdf/core';
import { BatesService } from '../lib/services/pdf/batesService';
import { PptToPdfService } from '../lib/services/pdf/converters/pptToPdf';

// Minimal DOM polyfill for PDF.js and jsPDF environment detection in workers
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
if (typeof window === 'undefined') {
    (self as any).window = self;
}

// Phase 36.2: Enterprise DOMParser Polyfill for XML-based Conversions
if (typeof (self as any).DOMParser === 'undefined') {
    (self as any).DOMParser = class {
        parseFromString(xml: string) {
            return {
                getElementsByTagName: (tag: string) => {
                    const tagRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>|<${tag}[^>]*\\/>`, 'g');
                    const matches: any[] = [];
                    let match;
                    while ((match = tagRegex.exec(xml)) !== null) {
                        const fullMatch = match[0];
                        const content = match[1] || "";
                        matches.push({
                            textContent: content.replace(/<[^>]+>/g, ''),
                            getAttribute: (attr: string) => {
                                const attrRegex = new RegExp(`${attr}="([^"]*)"`);
                                const attrMatch = fullMatch.match(attrRegex);
                                return attrMatch ? attrMatch[1] : null;
                            },
                            getElementsByTagName: (subTag: string) => {
                                // Recursive subset for nested lookups
                                return (self as any).DOMParser.prototype.parseFromString(fullMatch).getElementsByTagName(subTag);
                            }
                        });
                    }
                    return matches;
                }
            };
        }
    };
}

/**
 * Worker to offload heavy PDF operations from the main thread.
 */

self.onmessage = async (e: MessageEvent) => {
    const { type, id, payload } = e.data;

    try {
        switch (type) {
            case 'ORGANIZE_PDF': {
                const { pages, fileDatas } = payload;
                // fileDatas: Map-like object { [fileId]: ArrayBuffer }

                const newPdf = await PDFDocument.create();
                const loadedPdfs = new Map<string, PDFDocument>();

                // Load all source PDFs
                for (const fid of Object.keys(fileDatas)) {
                    loadedPdfs.set(fid, await PDFDocument.load(fileDatas[fid]));
                }

                // Process pages
                for (const p of pages) {
                    const sourcePdf = loadedPdfs.get(p.fileId);
                    if (sourcePdf) {
                        const [copiedPage] = await newPdf.copyPages(sourcePdf, [p.pageIndex]);
                        const rotationToAdd = p.rotation || 0;
                        if (rotationToAdd !== 0) {
                            const currentRotation = copiedPage.getRotation().angle;
                            copiedPage.setRotation(degrees((currentRotation + rotationToAdd) % 360));
                        }
                        newPdf.addPage(copiedPage);
                    }
                }

                const pdfBytes = await newPdf.save();
                (self as any).postMessage({ type: 'SUCCESS', id, result: pdfBytes }, [pdfBytes.buffer]);
                break;
            }

            case 'COMPRESS_PDF': {
                const { fileData, options } = payload;
                const { OptimizationService } = await import('../lib/services/pdf/OptimizationService');
                const result = await OptimizationService.optimize(fileData, options);
                const pdfBytes = result instanceof Uint8Array ? result : await (result as any).save();
                (self as any).postMessage({ type: 'SUCCESS', id, result: pdfBytes }, [pdfBytes.buffer]);
                break;
            }

            case 'EXCEL_TO_PDF': {
                const { fileData, options } = payload;
                const { officeToPdf } = await import('../lib/services/pdf/converters/officeToPdf');
                const result = await officeToPdf(new File([fileData], 'temp.xlsx'), options);
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'WORD_TO_PDF': {
                const { fileData, options } = payload;
                const { officeToPdf } = await import('../lib/services/pdf/converters/officeToPdf');
                const result = await officeToPdf(new File([fileData], 'temp.docx'), options);
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'PPT_TO_PDF': {
                const { fileData, options } = payload;
                const { officeToPdf } = await import('../lib/services/pdf/converters/officeToPdf');
                const result = await officeToPdf(new File([fileData], 'temp.pptx'), options);
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'IMAGE_TO_PDF': {
                const { images, options } = payload;
                // images: { data: ArrayBuffer, type: string, name: string }[]
                const pdfDoc = await PDFDocument.create();

                for (const img of images) {
                    let embeddedImg;
                    const isJpg = img.type === 'image/jpeg' || img.type === 'image/jpg';
                    if (isJpg) {
                        embeddedImg = await pdfDoc.embedJpg(img.data);
                    } else {
                        embeddedImg = await pdfDoc.embedPng(img.data);
                    }

                    const { width, height } = embeddedImg;
                    const page = pdfDoc.addPage([width, height]);
                    page.drawImage(embeddedImg, { x: 0, y: 0, width, height });
                }

                const pdfBytes = await pdfDoc.save();
                (self as any).postMessage({ type: 'SUCCESS', id, result: pdfBytes }, [pdfBytes.buffer]);
                break;
            }

            case 'ADD_PAGE_NUMBERS': {
                const { fileData, options } = payload;
                const result = await addPageNumbers(fileData, options);
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'ADD_WATERMARK': {
                const { fileData, text, options } = payload;
                const result = await addWatermark(fileData, text, options);
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'PROTECT_PDF': {
                const { fileData, options } = payload;
                const result = await protectPDF(fileData, options);
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'UNLOCK_PDF': {
                const { fileData, password } = payload;
                const result = await unlockPDF(fileData, password);
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'SPLIT_PDF': {
                const { fileData, settings } = payload;
                const sourcePdf = await PDFDocument.load(fileData);
                const totalPages = sourcePdf.getPageCount();

                let splitIndices: number[][] = [];
                if (settings.mode === 'manual' && settings.selectedPages) {
                    splitIndices = settings.selectedPages.map((p: number) => [p - 1]);
                } else if (settings.mode === 'interval' && settings.interval) {
                    for (let i = 0; i < totalPages; i += settings.interval) {
                        const chunk: number[] = [];
                        for (let j = 0; j < settings.interval && (i + j) < totalPages; j++) {
                            chunk.push(i + j);
                        }
                        splitIndices.push(chunk);
                    }
                } else if (settings.mode === 'range' && settings.ranges) {
                    const parts = settings.ranges.split(',').map((p: string) => p.trim());
                    for (const part of parts) {
                        if (part.includes('-')) {
                            const [start, end] = part.split('-').map((n: string) => parseInt(n));
                            if (!isNaN(start) && !isNaN(end)) {
                                const chunk: number[] = [];
                                for (let i = start; i <= end; i++) {
                                    if (i >= 1 && i <= totalPages) chunk.push(i - 1);
                                }
                                if (chunk.length > 0) splitIndices.push(chunk);
                            }
                        } else {
                            const pageNum = parseInt(part);
                            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                                splitIndices.push([pageNum - 1]);
                            }
                        }
                    }
                }

                if (splitIndices.length === 0) throw new Error("No pages selected for splitting");

                const zip = new JSZip();
                for (let i = 0; i < splitIndices.length; i++) {
                    const indices = splitIndices[i];
                    const newPdf = await PDFDocument.create();
                    const copiedPages = await newPdf.copyPages(sourcePdf, indices);
                    copiedPages.forEach(page => newPdf.addPage(page));
                    applyBranding(newPdf);
                    const pdfBytes = await newPdf.save();

                    const rangeStr = indices.length === 1
                        ? `page_${indices[0] + 1}`
                        : `pages_${indices[0] + 1}-${indices[indices.length - 1] + 1}`;
                    zip.file(`split_${rangeStr}.pdf`, pdfBytes);
                }

                const zipData = await zip.generateAsync({ type: 'uint8array' });
                (self as any).postMessage({ type: 'SUCCESS', id, result: zipData }, [zipData.buffer]);
                break;
            }

            case 'BATES_STAMP': {
                const { fileData, options } = payload;
                // Since BatesService.stamp returns a Blob, we'll re-implement or adapt it here to stay in worker
                const pdfDoc = await PDFDocument.load(fileData);
                const pages = pdfDoc.getPages();
                // ... Simplified bates logic for worker or import it
                // Actually, I'll just use the service but extract the bytes
                const resultBlob = await BatesService.stamp(new Blob([fileData]) as any, options);
                const resultBytes = new Uint8Array(await resultBlob.arrayBuffer());
                (self as any).postMessage({ type: 'SUCCESS', id, result: resultBytes }, [resultBytes.buffer]);
                break;
            }

            case 'MAIL_MERGE': {
                const { templateData, rows } = payload;
                const zip = new JSZip();

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const pdfDoc = await PDFDocument.load(templateData);
                    const form = pdfDoc.getForm();
                    const fields = form.getFields();

                    let matched = 0;
                    fields.forEach(field => {
                        const name = field.getName();
                        if (row[name]) {
                            try {
                                form.getTextField(name).setText(row[name]);
                                matched++;
                            } catch (e) { /* skip non-text fields or errors */ }
                        }
                    });

                    if (matched > 0) form.flatten();
                    applyBranding(pdfDoc);
                    const pdfBytes = await pdfDoc.save();
                    const fileName = `${row['Name'] || row['ID'] || `doc_${i}`}.pdf`;
                    zip.file(fileName, pdfBytes);
                }

                const zipData = await zip.generateAsync({ type: 'uint8array' });
                (self as any).postMessage({ type: 'SUCCESS', id, result: zipData }, [zipData.buffer]);
                break;
            }

            case 'SIGN_PDF': {
                const { fileData, signatureData, signatureType, placements } = payload;
                const pdfDoc = await PDFDocument.load(fileData);
                const pages = pdfDoc.getPages();

                let embeddedImage: any = null;
                if (signatureType === 'image') {
                    // Extract base64 and embed
                    const base64Data = signatureData.split(',')[1] || signatureData;
                    embeddedImage = await pdfDoc.embedPng(base64Data); // Assuming PNG from canvas
                }

                const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

                for (const placement of placements) {
                    const page = pages[placement.pageIndex];
                    if (!page) continue;

                    const { width, height } = page.getSize();
                    // Map placement coords (usually top-left relative) to PDF coords (bottom-left)
                    // If placement.y is from top: pdfY = pageHeight - placementY - placementHeight
                    const pdfX = (placement.x / placement.pageWidth) * width;
                    const pdfY = height - ((placement.y + placement.height) / placement.pageHeight) * height;
                    const pdfW = (placement.width / placement.pageWidth) * width;
                    const pdfH = (placement.height / placement.pageHeight) * height;

                    if (signatureType === 'image' && embeddedImage) {
                        page.drawImage(embeddedImage, {
                            x: pdfX,
                            y: pdfY,
                            width: pdfW,
                            height: pdfH
                        });
                    } else if (signatureType === 'text') {
                        page.drawText(signatureData, {
                            x: pdfX,
                            y: pdfY + 5, // Small offset for baseline
                            size: pdfH * 0.8,
                            font: helveticaFont,
                            color: rgb(0, 0, 0)
                        });
                    }
                }

                applyBranding(pdfDoc);
                const result = await pdfDoc.save();
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'PDF_TO_IMAGE': {
                const { fileData, format, scale, quality } = payload;
                const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');

                // Set worker src if needed, but in a worker it often works out of box or needs local path
                const loadingTask = pdfjsLib.getDocument({ data: fileData });
                const pdf = await loadingTask.promise;
                const totalPages = pdf.numPages;

                const zip = new JSZip();

                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale });

                    // Use OffscreenCanvas for worker rendering
                    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
                    const context = canvas.getContext('2d', { willReadFrequently: true });

                    if (context) {
                        await page.render({ canvasContext: context as any, viewport }).promise;
                        const blob = await canvas.convertToBlob({
                            type: format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp',
                            quality
                        });
                        const imgData = await blob.arrayBuffer();
                        zip.file(`page-${pageNum}.${format === 'jpeg' ? 'jpg' : format}`, imgData);
                    }
                }

                const result = await zip.generateAsync({ type: 'uint8array' });
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                await pdf.destroy();
                break;
            }

            case 'REDACT_PDF': {
                const { fileData, annotations } = payload;
                const pdfDoc = await PDFDocument.load(fileData);

                // 1. Apply Redaction Boxes
                if (annotations && annotations.length > 0) {
                    const pages = pdfDoc.getPages();
                    for (const anno of annotations) {
                        if (anno.type !== 'redaction') continue;

                        const page = pages[anno.pageIndex];
                        if (!page) continue;

                        const { width, height } = page.getSize();

                        // Annotations are in Viewport coords (relative to width/height of preview)
                        // We need to map them back to PDF units (pts)
                        // Note: viewport scale in preview was likely 1.0 or similar.
                        // Assuming anno.x/y are from the InteractiveOverlay which matches PDFPageViewer's canvas.
                        // PDFPageViewer uses canvas.width = viewport.width.

                        // Since we don't have the original viewport here, we assume the annotations 
                        // are normalized or we use a standard mapping.
                        // In AnnotatorShell we set InteractiveOverlay width/height to viewerDimensions.

                        // The mapping used in other tools:
                        // pdfX = (anno.x / pageWidth) * width
                        // pdfY = height - ((anno.y + anno.height) / pageHeight) * height

                        // We need to know the pageWidth/pageHeight used in the UI.
                        // For now, assume the UI used the same aspect ratio.

                        const pdfX = (anno.x / page.getWidth()) * width; // This is redundant if already in points
                        // Actually, if they are in viewport pixels, we need the viewport dimensions.
                        // Let's assume annotations were sent with original pageWidth/pageHeight for normalization.

                        // If anno has pageWidth/pageHeight:
                        const pageWidth = anno.pageWidth || page.getWidth();
                        const pageHeight = anno.pageHeight || page.getHeight();

                        const x = (anno.x / pageWidth) * width;
                        const y = height - ((anno.y + anno.height) / pageHeight) * height;
                        const w = (anno.width / pageWidth) * width;
                        const h = (anno.height / pageHeight) * height;

                        page.drawRectangle({
                            x,
                            y,
                            width: w,
                            height: h,
                            color: rgb(0, 0, 0), // Black
                            opacity: 1 // Fully opaque
                        });
                    }
                }

                // 2. Strip Metadata
                pdfDoc.setTitle('');
                pdfDoc.setAuthor('');
                pdfDoc.setSubject('');
                pdfDoc.setKeywords([]);
                pdfDoc.setProducer('AntiGravity Secure');
                pdfDoc.setCreator('AntiGravity Secure');
                pdfDoc.setCreationDate(new Date());
                pdfDoc.setModificationDate(new Date());

                // 3. Flatten Annotations (destroys interaction)
                const form = pdfDoc.getForm();
                try {
                    form.flatten();
                } catch (e) {
                    // ignore
                }

                applyBranding(pdfDoc);
                const result = await pdfDoc.save();
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'RENDER_PAGE': {
                const { fileData, pageNum, scale } = payload;
                const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
                const loadingTask = pdfjsLib.getDocument({ data: fileData });
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale });

                const canvas = new OffscreenCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d', { willReadFrequently: true });
                if (context) {
                    await page.render({ canvasContext: context as any, viewport }).promise;
                    const imageBitmap = canvas.transferToImageBitmap();
                    (self as any).postMessage({ type: 'SUCCESS', id, result: imageBitmap }, [imageBitmap]);
                }
                await pdf.destroy();
                break;
            }

            case 'SCAN_TO_PDF': {
                const { imageUrls, options } = payload;
                const pdfDoc = await PDFDocument.create();

                for (const url of imageUrls) {
                    const imgBytes = await fetch(url).then(res => res.arrayBuffer());
                    const img = await pdfDoc.embedJpg(imgBytes);

                    const page = pdfDoc.addPage([img.width, img.height]);
                    page.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: img.width,
                        height: img.height,
                    });
                }

                if (options?.addBranding) {
                    applyBranding(pdfDoc);
                }

                const result = await pdfDoc.save();
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'EDIT_PDF': {
                const { fileData, objectsRecord, scale } = payload;
                const { renderFabricToPDF } = await import('../lib/pdf-utils-edit');
                const result = await renderFabricToPDF(fileData, objectsRecord, scale);
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.buffer]);
                break;
            }

            case 'PDF_TO_WORD': {
                const { fileData } = payload;
                // Since this is heavy, we'll wrap the service
                const { pdfToWord } = await import('../lib/services/pdf/converters/pdfToWord');
                const { data, isScanned } = await pdfToWord(new File([fileData], 'temp.pdf'));
                (self as any).postMessage({ type: 'SUCCESS', id, result: { data, isScanned } }, [data.buffer]);
                break;
            }

            case 'OCR_PDF': {
                const { fileData, options } = payload;
                const { ocrPdfFull } = await import('../lib/services/pdf/converters/ocrPdf');

                // Need a mock File for the service if it expects one
                const result = await ocrPdfFull(new File([fileData], 'temp.pdf'), options);
                (self as any).postMessage({ type: 'SUCCESS', id, result }, [result.pdf.buffer]);
                break;
            }

            case 'REPAIR_PDF': {
                const { fileData } = payload;
                const { executeHealAction } = await import('../lib/services/pdf/manipulators/repair');
                const result = await executeHealAction(new File([fileData], 'temp.pdf'));
                (self as any).postMessage({ type: 'SUCCESS', id, result: { data: result.data, report: result.report } }, [result.data.buffer]);
                break;
            }

            case 'BIO_ENCODE': {
                const { fileData } = payload;
                const { BioEncoder } = await import('../lib/codecs/BioEncoder');
                const result = await BioEncoder.encode(new Blob([fileData]));
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'ANALYZE_SECURITY': {
                const { fileData } = payload;
                const { analyzeSecurity } = await import('../lib/services/pdf/security');
                const result = await analyzeSecurity(new File([fileData], 'temp.pdf'));
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'EXTRACT_TEXT': {
                const { fileData } = payload;
                const { extractTextFromPDF } = await import('../lib/pdf-text-extractor');
                const result = await extractTextFromPDF(new File([fileData], 'temp.pdf'));
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'APPLY_FILTER': {
                const { imageData, width, height, filter } = payload;
                const { applyScanFilter } = await import('../lib/services/pdf/scan/scan-utils');

                // We simulate the context by passing raw data
                // In scan-utils, we'll need to adjust it to take data directly or mock the context
                const data = new Uint8ClampedArray(imageData);

                // Temporary shim for applyScanFilter if it expects a context
                // We'll refactor scan-utils to take raw data for worker compatibility
                const { applyScanFilterOnData } = await import('../lib/services/pdf/scan/scan-utils');
                applyScanFilterOnData(data, width, height, filter);

                (self as any).postMessage({ type: 'SUCCESS', id, result: data }, [data.buffer]);
                break;
            }

            case 'PDF_TO_EXCEL': {
                const { fileData, options } = payload;
                const { pdfToExcel } = await import('../lib/services/pdf/converters/pdfToExcel');
                const result = await pdfToExcel(new File([fileData], 'temp.pdf'), options);
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'PDF_TO_PPTX': {
                const { fileData, options } = payload;
                const { PptxService } = await import('../lib/services/pdf/converters/pdfToPptx');
                const result = await PptxService.convert(new File([fileData], 'temp.pdf'), options);
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'GET_METADATA': {
                const { fileData } = payload;
                const { getMetadata } = await import('../lib/services/pdf/manipulators/metadata');
                const result = await getMetadata(new File([fileData], 'temp.pdf'));
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'EDIT_METADATA': {
                const { fileData, metadata } = payload;
                const { updateMetadata } = await import('../lib/services/pdf/manipulators/metadata');
                const result = await updateMetadata(new File([fileData], 'temp.pdf'), metadata);
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'STRIP_METADATA': {
                const { fileData } = payload;
                const { stripMetadata } = await import('../lib/services/pdf/manipulators/metadata');
                const result = await stripMetadata(new File([fileData], 'temp.pdf'));
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'FLATTEN_PDF': {
                const { fileData, options } = payload;
                const { flattenPDF } = await import('../lib/services/pdf/manipulators/basic');
                const result = await flattenPDF(fileData, options);
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'CROP_PDF': {
                const { fileData, margins, options } = payload;
                const { cropPDF } = await import('../lib/services/pdf/manipulators/basic');
                const result = await cropPDF(fileData, margins, options);
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'CONVERT_PDFA': {
                const { fileData } = payload;
                const { convertToPdfA } = await import('../lib/services/pdf/standards/pdfA');
                const result = await convertToPdfA(fileData);
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'PRINT_READY_PDF': {
                const { files, options } = payload;
                const { convertImagesToPrintPdf } = await import('../lib/services/pdf/print/imageToPrintPdf');
                const result = await convertImagesToPrintPdf(files, options);
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'WORKFLOW_EXECUTE': {
                const { fileData, steps } = payload;
                const { workflowEngine } = await import('../lib/workflow-engine');
                const result = await workflowEngine.execute(new File([fileData], 'temp.pdf'), steps);
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'DIFF_PAGES': {
                const { fileAData, fileBData, pageNum } = payload;
                const { PDFDiffEngine } = await import('../lib/services/pdf/diff-engine');
                const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');

                // Load PDFs in worker
                const [pdfA, pdfB] = await Promise.all([
                    pdfjsLib.getDocument({ data: fileAData }).promise,
                    pdfjsLib.getDocument({ data: fileBData }).promise
                ]);

                const [pageA, pageB] = await Promise.all([
                    pdfA.getPage(pageNum),
                    pdfB.getPage(pageNum)
                ]);

                const engine = new PDFDiffEngine();
                const result = await engine.comparePages(pageA, pageB);
                (self as any).postMessage({ type: 'SUCCESS', id, result });
                break;
            }

            case 'ANALYZE_PAGES': {
                const { fileDatas } = payload;
                const pageMetadata: any[] = [];

                for (const fileId in fileDatas) {
                    const doc = await PDFDocument.load(fileDatas[fileId]);
                    const pages = doc.getPages();
                    for (let i = 0; i < pages.length; i++) {
                        pageMetadata.push({
                            fileId,
                            pageIndex: i,
                            topic: 'General',
                            date: null
                        });
                    }
                }

                (self as any).postMessage({ type: 'SUCCESS', id, result: pageMetadata });
                break;
            }

            default:
                (self as any).postMessage({ type: 'ERROR', id, message: `Unknown task type: ${type}` });
        }
    } catch (error: any) {
        (self as any).postMessage({ type: 'ERROR', id, message: error.message });
    }
};
