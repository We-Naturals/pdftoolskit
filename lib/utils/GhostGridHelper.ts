
import { TextItemWithCoords } from '@/lib/pdf-text-extractor';

export class GhostGridHelper {
    /**
     * Detects vertical whitespace rivers that likely represent column gaps.
     * @param items Text items on the page
     * @param pageWidth Page width
     * @returns Array of x-coordinates where columns likely start/end
     */
    static detectColumns(items: TextItemWithCoords[], pageWidth: number): number[] {
        if (items.length === 0) return [];

        // 1. Create a histogram of X coordinates (where text exists)
        // We look for gaps in the X-protection.
        const resolution = 5; // Check every 5 pixels
        const occupied = new Array(Math.ceil(pageWidth / resolution)).fill(false);

        items.forEach(item => {
            const startIdx = Math.floor(item.x / resolution);
            const endIdx = Math.floor((item.x + item.width) / resolution);
            for (let i = startIdx; i <= endIdx; i++) {
                if (i >= 0 && i < occupied.length) {
                    occupied[i] = true; // eslint-disable-line security/detect-object-injection
                }
            }
        });

        // 2. Find long contiguous runs of 'false' (gaps)
        const gaps: { start: number, end: number, width: number }[] = [];
        let currentGapStart = -1;

        occupied.forEach((isOccupied, i) => {
            if (!isOccupied) {
                if (currentGapStart === -1) currentGapStart = i;
            } else {
                if (currentGapStart !== -1) {
                    // Gap ended
                    gaps.push({
                        start: currentGapStart * resolution,
                        end: i * resolution,
                        width: (i - currentGapStart) * resolution
                    });
                    currentGapStart = -1;
                }
            }
        });

        // 3. Filter for "significant" gaps (e.g. > 20px wide) that look like layout columns
        // We'll return the center line of these gaps
        return gaps
            .filter(g => g.width > 20)
            .map(g => g.start + g.width / 2);
    }
}
