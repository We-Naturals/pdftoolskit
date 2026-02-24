/* eslint-disable */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PDFDocument, rgb, StandardFonts, PDFPage, degrees, PDFFont } from 'pdf-lib';
import { applyBranding } from './pdf-utils';
// Removed unused getFontBytes

export type FontName = 'Helvetica' | 'Times Roman' | 'Courier' | 'Symbol' | 'Inter';

export type PDFModification = {
    type: 'text' | 'image' | 'shape' | 'drawing' | 'field';
    pageIndex: number;
    x: number;
    y: number; // Top-left relative from UI
    // Text
    text?: string;
    textSize?: number;
    textColor?: string; // Hex
    font?: FontName;
    // Image
    imageData?: Uint8Array;
    width?: number;
    height?: number;
    // Shape & Drawing
    shapeType?: 'rectangle' | 'circle' | 'line';
    strokeColor?: string; // Hex
    fillColor?: string; // Hex
    strokeWidth?: number;
    opacity?: number;
    rotate?: number; // Degrees
    // Drawing specific
    pathPoints?: { x: number, y: number }[];
    // SVG Path (for icons/signatures)
    svgPath?: string;
    scale?: number;
    zIndex?: number;

    // Field (New Form Builder)
    fieldType?: 'text' | 'checkbox' | 'dropdown';
    fieldName?: string;
    fieldValue?: string;
    readOnly?: boolean;
    required?: boolean;
    multiline?: boolean;
    checked?: boolean;
    options?: string[]; // For dropdowns
    // True Sanitize
    isRedaction?: boolean;
    // Bio-Sign
    biometricData?: Record<string, unknown>;
};

export async function editPDF(
    file: File,
    modifications: PDFModification[]
): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Embed Bio-Sign Metadata if present
    const bioSignatures = modifications.filter(m => m.biometricData);
    if (bioSignatures.length > 0) {
        const bioData = bioSignatures.map(s => ({
            id: s.fieldName || 'sig_' + Date.now(),
            page: s.pageIndex,
            data: s.biometricData
        }));

        // Embed as custom metadata
        let existingMeta: Record<string, unknown> = {};
        try {
            const sub = pdfDoc.getSubject();
            if (sub) existingMeta = JSON.parse(sub);
        } catch (_e) {
            // If not JSON, preserve as originalSubject
            existingMeta = { originalSubject: pdfDoc.getSubject() };
        }

        pdfDoc.setSubject(JSON.stringify({ ...existingMeta, bioSignatures: bioData }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fonts: Record<string, any> = {

        'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
        'Times Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
        'Courier': await pdfDoc.embedFont(StandardFonts.Courier),
        'Symbol': await pdfDoc.embedFont(StandardFonts.Symbol),
    };

    // Try to embed Inter if used
    if (modifications.some(m => m.font === 'Inter')) {
        try {
            // Fetch font from public directory
            // const fontUrl = 'https://pdftoolskit.vercel.app/fonts/Inter-Regular.ttf'; // Using absolute for browser-side or handling accordingly
            // Since we are server-side in this utility context (or client side with fetch)
            const origin = typeof window !== 'undefined' ? window.location.origin : (self as any).location.origin;
            const fontRes = await fetch(new URL('/fonts/Inter-Regular.ttf', origin));
            // The following line was provided in the instruction. It appears to be a malformed line
            // that attempts to return a Blob and embed a font simultaneously, which is syntactically incorrect
            // and semantically out of place in this context.
            // To maintain syntactic correctness as per instructions, the line is commented out.
            // If the intent was to replace the font embedding, please provide the correct replacement.
            // return new Blob([stampedBytes as any], { type: 'application/pdf' }); // Reverting to any to bypass complex BlobPart mismatch.embedFont(fontBytes);
            const fontBytes = await fontRes.arrayBuffer();
            fonts['Inter'] = await pdfDoc.embedFont(fontBytes);
        } catch (error) {
            console.warn("Failed to embed Inter font, falling back to Helvetica", error);
            fonts['Inter'] = fonts['Helvetica'];
        }
    }

    const pages = pdfDoc.getPages();

    // Sort modifications by zIndex for correct rendering order
    const sortedMods = [...modifications].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const form = pdfDoc.getForm();

    for (const mod of sortedMods) {
        if (mod.pageIndex < 0 || mod.pageIndex >= pages.length) continue;
        const page = pages[mod.pageIndex];
        const { height: pageHeight } = page.getSize();

        // Color helpers
        const getRgb = (hex?: string) => hex ? hexToRgb(hex) : undefined;

        // Ensure unique field name if not provided
        const fieldName = mod.fieldName || `field_${mod.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const options = {
            opacity: mod.opacity ?? 1,
            color: getRgb(mod.fillColor),
            borderColor: getRgb(mod.strokeColor),
            borderWidth: mod.strokeWidth ?? 1,
            rotate: mod.rotate ? degrees(mod.rotate) : undefined
        };

        if (mod.type === 'field') {
            const pdfY = pageHeight - mod.y - (mod.height || 20);

            if (mod.fieldType === 'text') {
                try {
                    const textField = form.createTextField(fieldName);
                    textField.setText(mod.fieldValue || '');
                    textField.addToPage(page, {
                        x: mod.x,
                        y: pdfY,
                        width: mod.width || 200,
                        height: mod.height || 20,
                        textColor: getRgb(mod.textColor) || rgb(0, 0, 0),
                        backgroundColor: getRgb(mod.fillColor),
                        borderColor: getRgb(mod.strokeColor),
                        borderWidth: mod.strokeWidth ?? 1,
                    });
                    if (mod.readOnly) textField.enableReadOnly();
                    if (mod.required) textField.enableRequired();
                    if (mod.multiline) textField.enableMultiline();
                } catch (e) {
                    console.error("Failed to create text field", e);
                }
            } else if (mod.fieldType === 'checkbox') {
                try {
                    const checkBox = form.createCheckBox(fieldName);
                    checkBox.addToPage(page, {
                        x: mod.x,
                        y: pdfY,
                        width: mod.width || 20,
                        height: mod.height || 20,
                        textColor: getRgb(mod.textColor) || rgb(0, 0, 0),
                        backgroundColor: getRgb(mod.fillColor),
                        borderColor: getRgb(mod.strokeColor),
                        borderWidth: mod.strokeWidth ?? 1,
                    });
                    if (mod.fieldValue === 'true' || mod.checked) checkBox.check();
                    if (mod.readOnly) checkBox.enableReadOnly();
                    if (mod.required) checkBox.enableRequired();
                } catch (e) {
                    console.error("Failed to create checkbox", e);
                }
            }
            else if (mod.fieldType === 'dropdown' && mod.options) { // Example expansion
                // Dropdown logic could go here
            }

        } else if (mod.type === 'text' && mod.text) {
            // ... (Existing Text Logic)
            const size = mod.textSize || 12;
            const color = mod.textColor ? hexToRgb(mod.textColor) : rgb(0, 0, 0);
            const font = fonts[mod.font || 'Helvetica'];

            // Baseline adjustment approx
            const pdfY = pageHeight - mod.y - (size * 0.75);

            page.drawText(mod.text, {
                x: mod.x,
                y: pdfY,
                size: size,
                font: font,
                color: color,
                opacity: mod.opacity ?? 1, // Fix: Use direct mod access or options
                rotate: options.rotate
            });
        }
        else if (mod.type === 'image' && mod.imageData) {
            // ... (Existing Image Logic)
            let image;
            try {
                image = await pdfDoc.embedPng(mod.imageData);
            } catch {
                try {
                    image = await pdfDoc.embedJpg(mod.imageData);
                } catch (e) {
                    console.error("Failed to embed image", e);
                    continue;
                }
            }
            const w = mod.width || 100;
            const h = mod.height || 100;
            const pdfY = pageHeight - mod.y - h;

            page.drawImage(image, {
                x: mod.x,
                y: pdfY,
                width: w,
                height: h,
                opacity: mod.opacity ?? 1,
                rotate: options.rotate
            });
        }
        else if (mod.type === 'shape') {
            // ... (Existing Shape Logic)
            const pdfY = pageHeight - mod.y - (mod.height || 0);

            if (mod.shapeType === 'rectangle' || mod.isRedaction) {
                page.drawRectangle({
                    x: mod.x,
                    y: pdfY,
                    width: mod.width || 50,
                    height: mod.height || 50,
                    ...options,
                    color: mod.isRedaction ? rgb(0, 0, 0) : options.color, // Force black for redaction
                    opacity: 1 // Force opaque
                });
            } else if (mod.shapeType === 'circle') {
                const r = (mod.width || 50) / 2;
                page.drawCircle({
                    x: mod.x + r,
                    y: pdfY + (mod.height || 50) / 2,
                    size: r,
                    ...options
                });
            } else if (mod.shapeType === 'line') {
                page.drawLine({
                    start: { x: mod.x, y: pageHeight - mod.y },
                    end: { x: mod.x + (mod.width || 50), y: pageHeight - (mod.y + (mod.height || 0)) },
                    thickness: mod.strokeWidth || 1,
                    color: options.borderColor || rgb(0, 0, 0),
                    opacity: options.opacity
                });
            }
        }
        else if (mod.type === 'drawing') {
            // ... (Existing Drawing Logic)
            if (mod.svgPath) {
                // SVG Path Rendering
                const pdfY = pageHeight - mod.y - (mod.height || 50);
                page.drawSvgPath(mod.svgPath, {
                    x: mod.x,
                    y: pdfY,
                    scale: mod.scale || 1,
                    color: options.borderColor || rgb(0, 0, 0),
                    opacity: options.opacity,
                    rotate: options.rotate,
                    borderWidth: mod.strokeWidth // Actually thickness for path
                });
            }
            else if (mod.pathPoints && mod.pathPoints.length > 1) {
                // Freehand Lines
                const points = mod.pathPoints;
                const pathColor = getRgb(mod.strokeColor) || rgb(0, 0, 0);
                const thick = mod.strokeWidth || 2;

                for (let i = 0; i < points.length - 1; i++) {
                    // eslint-disable-next-line security/detect-object-injection
                    const p1 = points[i];
                    // eslint-disable-next-line security/detect-object-injection
                    const p2 = points[i + 1];

                    page.drawLine({
                        start: { x: p1.x, y: pageHeight - p1.y },
                        end: { x: p2.x, y: pageHeight - p2.y },
                        thickness: thick,
                        color: pathColor,
                        opacity: mod.opacity ?? 1
                    });
                }
            }
        }
    }

    applyBranding(pdfDoc);
    return await pdfDoc.save();
}

export async function renderFabricToPDF(
    file: File | Uint8Array,
    objectsRecord: Record<string, unknown[]>,
    scale: number = 1
): Promise<Uint8Array> {
    const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    // Standard Fonts cache
    const embeddedFonts: Record<string, PDFFont> = {
        'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
        'Times Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
        'Courier': await pdfDoc.embedFont(StandardFonts.Courier),
    };

    // 1. Identify all unique fonts used in text objects
    const usedFonts = new Set<string>();
    const bioSignatures: unknown[] = []; // Store bio data for embedding

    Object.values(objectsRecord).forEach((objs, pageIndex) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (objs as any[]).forEach(o => {
            if (o.type === 'text' && o.fontFamily) {
                usedFonts.add(o.fontFamily);
            }
            // Collect Bio-Sign data
            if (o.biometricData) {
                bioSignatures.push({
                    id: o.id,
                    page: pageIndex,
                    data: o.biometricData
                });
            }
        });
    });

    // Embed Bio-Sign Metadata if present
    if (bioSignatures.length > 0) {
        let existingMeta: Record<string, unknown> = {};
        try {
            const sub = pdfDoc.getSubject();
            if (sub) existingMeta = JSON.parse(sub);
        } catch (_error) {
            existingMeta = { originalSubject: pdfDoc.getSubject() };
        }
        pdfDoc.setSubject(JSON.stringify({ ...existingMeta, bioSignatures }));
    }

    // 2. Embed custom fonts
    for (const fontName of Array.from(usedFonts)) {
        if (!embeddedFonts[fontName]) {
            if (fontName === 'Inter') {
                try {
                    const origin = typeof window !== 'undefined' ? window.location.origin : (self as any).location.origin;
                    const fontRes = await fetch(new URL('/fonts/Inter-Regular.ttf', origin));
                    const fontBytes = await fontRes.arrayBuffer();
                    embeddedFonts['Inter'] = await pdfDoc.embedFont(fontBytes);
                } catch (error) {
                    console.warn("Failed to embed Inter font, falling back to Helvetica", error);
                    embeddedFonts['Inter'] = embeddedFonts['Helvetica'];
                }
            } else if (embeddedFonts[fontName]) {
                // Already handled or standard font
            } else {
                // Fallback for unknown fonts
                embeddedFonts[fontName] = embeddedFonts['Helvetica'];
            }
        }
    }

    for (let i = 0; i < pages.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const page = pages[i];
        const pageId = `page-${i}`;
        // eslint-disable-next-line security/detect-object-injection
        const pageObjects = objectsRecord[pageId] || [];
        const { height } = page.getSize(); // Removed width as it was unused

        for (const obj of pageObjects) {
            // Coordinate Mapping:
            // Fabric uses (left, top) relative to canvas.
            // PDF-Lib uses (x, y) starting from bottom-left.

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdfX = (obj as any).left / scale;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdfY = height - ((obj as any).top / scale);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((obj as any).type === 'text') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const size = ((obj as any).fontSize || 20) / scale;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const font = embeddedFonts[(obj as any).fontFamily] || embeddedFonts['Helvetica'];

                // Adjust Y for baseline (approx)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                page.drawText((obj as any).text || '', {
                    x: pdfX,
                    y: pdfY - (size * 0.8),
                    size: size,
                    font: font,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    color: hexToRgb((obj as any).fill || '#000000'),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rotate: (obj as any).angle ? degrees(-(obj as any).angle) : undefined,
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((obj as any).type === 'rect') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const w = ((obj as any).width * ((obj as any).scaleX || 1)) / scale;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const h = ((obj as any).height * ((obj as any).scaleY || 1)) / scale;

                if ((obj as any).isField) {
                    try {
                        const form = pdfDoc.getForm();
                        const fieldName = (obj as any).fieldName || `field_${(obj as any).id.slice(0, 4)}`;
                        const textField = form.createTextField(fieldName);
                        textField.setText((obj as any).text || '');
                        textField.addToPage(page, {
                            x: pdfX,
                            y: pdfY - h,
                            width: w,
                            height: h,
                            backgroundColor: (obj as any).fill ? hexToRgb((obj as any).fill) : undefined,
                        });
                    } catch (e) {
                        console.error("Failed to inject form field", e);
                    }
                } else {
                    page.drawRectangle({
                        x: pdfX,
                        y: pdfY - h,
                        width: w,
                        height: h,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        color: (obj as any).isRedaction ? rgb(0, 0, 0) : hexToRgb((obj as any).fill || '#FFFFFF'),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        rotate: (obj as any).angle ? degrees(-(obj as any).angle) : undefined,
                    });
                }

                // If this rect is a redaction, we should ideally "scrub" content under it.
                // For this MVP, we rely on the opaque overlay.

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((obj as any).type === 'image') {
                try {
                    let imgBytes: Uint8Array;
                    let isPng = true;

                    if ((obj as any).imageFile) {
                        imgBytes = new Uint8Array(await (obj as any).imageFile.arrayBuffer());
                        isPng = (obj as any).imageFile.type !== 'image/jpeg';
                    } else if ((obj as any).src && (obj as any).src.startsWith('data:')) {
                        // Handle Base64 (from QR codes or dropped images)
                        const base64Data = (obj as any).src.split(',')[1];
                        const binaryString = atob(base64Data);
                        imgBytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            imgBytes[i] = binaryString.charCodeAt(i);
                        }
                        isPng = (obj as any).src.includes('image/png') || (obj as any).src.includes('image/webp');
                    } else {
                        continue;
                    }

                    const embeddedImage = isPng
                        ? await pdfDoc.embedPng(imgBytes)
                        : await pdfDoc.embedJpg(imgBytes);

                    const imgW = ((obj as any).width * ((obj as any).scaleX || 1)) / scale;
                    const imgH = ((obj as any).height * ((obj as any).scaleY || 1)) / scale;

                    page.drawImage(embeddedImage, {
                        x: pdfX,
                        y: pdfY - imgH,
                        width: imgW,
                        height: imgH,
                        rotate: (obj as any).angle ? degrees(-(obj as any).angle) : undefined,
                    });

                    // Add hyper-link for QR codes
                    if ((obj as any).qrData) {
                        page.drawText('', { // Invisible link area
                            x: pdfX,
                            y: pdfY - imgH,
                            size: 1,
                        });
                        // In a real implementation, we would use pdfDoc.context.register(pdfDoc.context.obj({ ... })) 
                        // to add a Link annotation. For now, visual fidelity is the priority.
                    }

                } catch (e) {
                    console.error("Failed to embed image in PDF", e);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((obj as any).type === 'path') {
                const pathData = (obj as any).path;
                if (Array.isArray(pathData)) {
                    const color = hexToRgb((obj as any).stroke || '#000000');
                    const thickness = ((obj as any).strokeWidth || 2) / scale;
                    const opacity = (obj as any).opacity ?? 1;

                    // Convert Fabric path array to SVG path string
                    const svgPath = pathData.map(segment => segment.join(' ')).join(' ');

                    try {
                        page.drawSvgPath(svgPath, {
                            x: pdfX,
                            y: pdfY, // drawSvgPath handles coordinate mapping slightly differently? 
                            // Usually y is the bottom/start point. 
                            // However, Fabric paths are relative to their bounding box.
                            // We need to be careful with the origin.
                            color: color,
                            opacity: opacity,
                            borderWidth: thickness,
                            scale: 1 / scale,
                            rotate: (obj as any).angle ? degrees(-(obj as any).angle) : undefined,
                        });
                    } catch (e) {
                        console.warn("Failed to draw SVG path, using fallback lines", e);
                        // Fallback: simple line approximation if complex SVG fails
                        page.drawText("[Vector Path]", { x: pdfX, y: pdfY, size: 8 / scale });
                    }
                }
            }
        }
    }

    applyBranding(pdfDoc);
    return await pdfDoc.save();
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? rgb(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ) : rgb(0, 0, 0);
}

