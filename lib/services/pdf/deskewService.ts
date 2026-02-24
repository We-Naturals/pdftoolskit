import { pdfjsLib } from '../../utils/pdf-init';

export class DeskewService {
    /**
     * Calculates the skew angle for a specific page in a PDF file.
     * Uses the Projection Profile method (variance of horizontal projections).
     * @param file The PDF file
     * @param pageIndex 0-based page index
     * @returns Estimated skew angle in degrees (between -5 and 5)
     */
    static async calculateSkew(file: File, pageIndex: number): Promise<number> {
        try {
            const arrayBuffer = await file.arrayBuffer();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(pageIndex + 1); // pdfjs is 1-based

            // Render to canvas
            const viewport = page.getViewport({ scale: 0.5 }); // Downscale for performance
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) throw new Error("Could not create canvas context");

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const skew = this.detectSkew(imageData);

            // Cleanup
            canvas.width = 0;
            canvas.height = 0;

            return skew;
        } catch (error) {
            console.error("Deskew failed:", error);
            return 0;
        }
    }

    private static detectSkew(imageData: ImageData): number {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        // const stride = width * 4;

        // 1. binarize (Simple Threshold)
        // We only care about "dark" pixels (text)
        const pixels = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                // eslint-disable-next-line security/detect-object-injection
                const r = data[idx];
                // eslint-disable-next-line security/detect-object-injection
                const g = data[idx + 1];
                // eslint-disable-next-line security/detect-object-injection
                const b = data[idx + 2];
                // Luminance
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                // eslint-disable-next-line security/detect-object-injection
                pixels[y * width + x] = lum < 128 ? 1 : 0; // 1 = dark/text, 0 = background
            }
        }

        // 2. Projection Profile Search
        // We look for the angle that maximizes the variance of the horizontal projection profile.
        // If text is aligned horizontally, lines will have many black pixels and gaps will have few.
        // This creates high variance in the row sums.

        let maxVariance = 0;
        let bestAngle = 0;

        // Search range: -5 to +5 degrees
        // Step: 0.2 degrees
        for (let angle = -5; angle <= 5; angle += 0.2) {
            const rad = (angle * Math.PI) / 180;
            const variance = this.calculateVarianceForAngle(pixels, width, height, rad);
            if (variance > maxVariance) {
                maxVariance = variance;
                bestAngle = angle;
            }
        }

        return bestAngle;
    }

    private static calculateVarianceForAngle(pixels: Uint8Array, width: number, height: number, angleRad: number): number {
        const sin = Math.sin(angleRad);
        const cos = Math.cos(angleRad);

        const profile = new Float64Array(height);

        // Populate projection profile
        // For each pixel (x,y), project it to new y' coordinates
        // This is a simplification; strictly we should rotate the image, 
        // but projecting coordinates is faster for sparse data.

        // Optimization: Only sample a subset of pixels or iterate all?
        // Iterating all is safer for accuracy.

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // eslint-disable-next-line security/detect-object-injection
                if (pixels[y * width + x] === 1) {
                    // Rotate point (x,y) around center (width/2, height/2)
                    // We only care about the new Y coordinate
                    const cx = x - width / 2;
                    const cy = y - height / 2;

                    // y' = -x*sin + y*cos
                    // We map this back to profile array index
                    const yRotated = -cx * sin + cy * cos;
                    const profileIndex = Math.floor(yRotated + height / 2);

                    if (profileIndex >= 0 && profileIndex < height) {
                        // eslint-disable-next-line security/detect-object-injection
                        profile[profileIndex]++;
                    }
                }
            }
        }

        // Calculate variance of profile
        let sum = 0;
        let sumSq = 0;
        let count = 0; // Number of non-empty bins (optional, or typically height)

        for (let i = 0; i < height; i++) {
            // eslint-disable-next-line security/detect-object-injection
            const val = profile[i];
            sum += val;
            sumSq += val * val;
            count++;
        }

        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);

        return variance;
    }
}
