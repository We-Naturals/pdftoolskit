/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable security/detect-object-injection */
import { PDFDocument, PDFPage } from 'pdf-lib';
import { applyBranding, ensurePDFDoc, getGlobalPDFLib, getFileArrayBuffer } from './core';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

export interface ProtectionOptions {
    userPassword: string;
    ownerPassword?: string;
    permissions?: {
        printing?: 'highResolution' | 'lowResolution' | 'none';
        modifying?: boolean;
        copying?: boolean;
        annotating?: boolean;
        fillingForms?: boolean;
        contentAccessibility?: boolean;
        documentAssembly?: boolean;
    };
    encryptMetadata?: boolean;
}

export async function protectPDF(input: File | Blob | Uint8Array, options: ProtectionOptions): Promise<Uint8Array>;
export async function protectPDF(doc: PDFDocument, options: ProtectionOptions): Promise<PDFDocument>;
export async function protectPDF(
    input: File | Blob | PDFDocument | Uint8Array,
    options: ProtectionOptions
): Promise<Uint8Array | PDFDocument> {
    try {
        const PDFLib = await getGlobalPDFLib();
        const sourcePdf = await ensurePDFDoc(input);
        const newPdf = await PDFLib.PDFDocument.create();

        const pages = await newPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        pages.forEach((page: PDFPage) => newPdf.addPage(page));

        // Metadata Encryption Handling
        if (options.encryptMetadata === false) {
            const title = sourcePdf.getTitle();
            const author = sourcePdf.getAuthor();
            const subject = sourcePdf.getSubject();
            const producer = sourcePdf.getProducer();
            const creator = sourcePdf.getCreator();

            if (title) newPdf.setTitle(title);
            if (author) newPdf.setAuthor(author);
            if (subject) newPdf.setSubject(subject);
            if (producer) newPdf.setProducer(producer);
            if (creator) newPdf.setCreator(creator);
        } else {
            applyBranding(newPdf);
        }

        const permissionSettings = {
            printing: options.permissions?.printing || 'highResolution',
            modifying: options.permissions?.modifying ?? false,
            copying: options.permissions?.copying ?? false,
            annotating: options.permissions?.annotating ?? false,
            fillingForms: options.permissions?.fillingForms ?? false,
            contentAccessibility: options.permissions?.contentAccessibility ?? false,
            documentAssembly: options.permissions?.documentAssembly ?? false,
        };

        const hasEncryptMethod = typeof (newPdf as any).encrypt === 'function';

        if (hasEncryptMethod) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (newPdf as any).encrypt({
                userPassword: options.userPassword,
                ownerPassword: options.ownerPassword || options.userPassword,
                permissions: permissionSettings,
            });
            const encryptedBytes = await newPdf.save();
            if (input instanceof PDFDocument) return newPdf;
            return encryptedBytes;
        }

        // If native lib lacks encryption, we use jsPDF to create an encrypted image-based envelope.
        // This ensures the file is ACTUALLY locked as requested by the user.

        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const loadingTask = pdfjsLib.getDocument({ data: await sourcePdf.save() });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;

        // Create jsPDF instance with encryption
        const jspdfPermissions: ('print' | 'modify' | 'copy' | 'annot-forms')[] = [];
        if (options.permissions?.printing !== 'none') jspdfPermissions.push('print');
        if (options.permissions?.copying) jspdfPermissions.push('copy');
        if (options.permissions?.modifying) jspdfPermissions.push('modify', 'annot-forms');

        const doc = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4',
            encryption: {
                userPassword: options.userPassword,
                ownerPassword: options.ownerPassword || options.userPassword,
                userPermissions: jspdfPermissions
            }
        });

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 2.0; // High quality 
            const viewport = page.getViewport({ scale });

            const canvas = typeof OffscreenCanvas !== 'undefined'
                ? new OffscreenCanvas(viewport.width, viewport.height)
                : document.createElement('canvas');

            if (!canvas) continue;
            if (!(canvas instanceof OffscreenCanvas)) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
            }

            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (context) {
                await page.render({ canvasContext: context as any, viewport }).promise;

                let imageData: Uint8Array | string;
                if (canvas instanceof OffscreenCanvas) {
                    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
                    imageData = new Uint8Array(await blob.arrayBuffer());
                } else {
                    imageData = (canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.95);
                }

                if (pageNum > 1) doc.addPage([viewport.width, viewport.height]);
                else {
                    (doc as any).internal.pageSize.width = viewport.width;
                    (doc as any).internal.pageSize.height = viewport.height;
                }

                doc.addImage(imageData as any, 'JPEG', 0, 0, viewport.width, viewport.height);
            }
        }

        const arrayBuffer = doc.output('arraybuffer');
        await pdf.destroy();
        return new Uint8Array(arrayBuffer);
    } catch (error) {
        console.error('Protect PDF failed:', error);
        throw error;
    }
}

export interface SecurityAnalysis {
    isEncrypted: boolean;
    isOwnerLocked: boolean;
    isOpenLocked: boolean;
}

export async function analyzeSecurity(file: File): Promise<SecurityAnalysis> {
    const arrayBuffer = await getFileArrayBuffer(file);
    const PDFLib = await getGlobalPDFLib();

    try {
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const isEncrypted = pdfDoc.isEncrypted;
        return {
            isEncrypted,
            isOwnerLocked: isEncrypted,
            isOpenLocked: false
        };
    } catch (error: any) {
        const errorMsg = error?.message || '';
        if (errorMsg.includes('Password required') || errorMsg.includes('is encrypted') || errorMsg.includes('encrypted')) {
            return {
                isEncrypted: true,
                isOwnerLocked: false,
                isOpenLocked: true
            };
        }
        console.error('Security analysis error:', error);
        return { isEncrypted: false, isOwnerLocked: false, isOpenLocked: false };
    }
}

export async function unlockPDF(input: File | Blob | Uint8Array, password?: string): Promise<Uint8Array>;
export async function unlockPDF(doc: PDFDocument, password?: string): Promise<PDFDocument>;
export async function unlockPDF(input: File | Blob | PDFDocument | Uint8Array, password?: string): Promise<Uint8Array | PDFDocument> {
    try {
        const PDFLib = await getGlobalPDFLib();
        const buffer = input instanceof Uint8Array ? input : (input instanceof PDFDocument ? await input.save() : await getFileArrayBuffer(input));

        try {
            const encryptedPdf = await PDFLib.PDFDocument.load(buffer, {
                password: password || undefined,
                ignoreEncryption: false
            });
            const newPdf = await PDFLib.PDFDocument.create();
            const pages = await newPdf.copyPages(encryptedPdf, encryptedPdf.getPageIndices());
            pages.forEach((page: PDFPage) => newPdf.addPage(page));

            applyBranding(newPdf);
            if (input instanceof PDFDocument) return newPdf;
            return await newPdf.save();

        } catch (loadError: unknown) {
            let requiresFallback = false;
            if (loadError instanceof Error && loadError.message) {
                if (loadError.message.includes('Incorrect password')) {
                    throw new Error('Incorrect password.');
                }
                requiresFallback = true;
            } else {
                requiresFallback = true;
            }

            if (requiresFallback) {
                // eslint-disable-next-line no-console
                console.log('pdf-lib failed to decrypt the document. Invoking pdf.js AES fallback engine...');
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
                }

                try {
                    const loadingTask = pdfjsLib.getDocument({ data: buffer, password });
                    const pdf = await loadingTask.promise;
                    const totalPages = pdf.numPages;

                    const newPdf = await PDFLib.PDFDocument.create();

                    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const scale = 2.0;
                        const viewport = page.getViewport({ scale });

                        const canvas = typeof OffscreenCanvas !== 'undefined'
                            ? new OffscreenCanvas(viewport.width, viewport.height)
                            : document.createElement('canvas');

                        if (!canvas) continue;
                        if (!(canvas instanceof OffscreenCanvas)) {
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                        }

                        const context = canvas.getContext('2d', { willReadFrequently: true });
                        if (context) {
                            await page.render({ canvasContext: context as any, viewport }).promise;

                            let imageBuf: ArrayBuffer;
                            if (canvas instanceof OffscreenCanvas) {
                                const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
                                imageBuf = await blob.arrayBuffer();
                            } else {
                                const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.95);
                                const base64 = dataUrl.split(',')[1];
                                const binary = atob(base64);
                                imageBuf = new ArrayBuffer(binary.length);
                                const view = new Uint8Array(imageBuf);
                                for (let i = 0; i < binary.length; i++) {
                                    view[i] = binary.charCodeAt(i);
                                }
                            }

                            const image = await newPdf.embedJpg(imageBuf);
                            const newPage = newPdf.addPage([viewport.width, viewport.height]);
                            newPage.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });
                        }
                    }

                    applyBranding(newPdf);
                    await pdf.destroy();
                    if (input instanceof PDFDocument) return newPdf;
                    return await newPdf.save();

                } catch (pdfjsError: any) {
                    if (pdfjsError.name === 'PasswordException') {
                        if (pdfjsError.code === 1) throw new Error('This document is Password Locked. Please enter the Open Password.');
                        if (pdfjsError.code === 2) throw new Error('Incorrect password.');
                    }
                    console.error('pdf.js fallback also failed:', pdfjsError);
                    throw new Error('Failed to unlock PDF. The file might be corrupted or use unsupported encryption.');
                }
            }
            throw new Error('Failed to unlock PDF. The file might be corrupted or use unsupported encryption.');
        }
    } catch (error: unknown) {
        console.error('Unlock failed:', error);
        if (error instanceof Error && (error.message.includes('Password Locked') || error.message.includes('Incorrect password'))) {
            throw error;
        }
        throw new Error('Failed to unlock PDF. The file might be corrupted or use unsupported encryption.');
    }
}
