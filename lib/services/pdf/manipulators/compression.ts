
import { PDFDocument } from 'pdf-lib';
import { OptimizationService } from '../OptimizationService';

/**
 * Standard PDF compression via object streams and metadata removal
 */
export async function compressPDF(input: File | Blob | Uint8Array, quality?: number, targetSizeBytes?: number): Promise<Uint8Array>;
export async function compressPDF(doc: PDFDocument, quality?: number, targetSizeBytes?: number): Promise<PDFDocument>;
export async function compressPDF(
    input: File | Blob | PDFDocument | Uint8Array,
    quality: number = 0.7,
    targetSizeBytes?: number
): Promise<Uint8Array | PDFDocument> {
    return OptimizationService.optimize(input, {
        quality,
        targetSizeBytes
    });
}

/**
 * Aggressive compression by rasterizing pages to JPEGs
 */
export async function rasterizeAndCompressPDF(
    input: File | Blob | PDFDocument | Uint8Array,
    quality: number = 0.7,
    scale: number = 2.0
): Promise<Uint8Array | PDFDocument> {
    return OptimizationService.optimize(input, {
        quality,
        scale,
        targetSizeBytes: undefined // Force single pass optimization
    });
}
