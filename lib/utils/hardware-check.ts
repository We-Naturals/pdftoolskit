
/**
 * Hardware Compatibility & WebGPU Detection
 * Ensures the "Local Brain" has enough power to run instruction models.
 */
export interface HardwareStats {
    hasWebGPU: boolean;
    hasSharedArrayBuffer: boolean;
    hasOffscreenCanvas: boolean;
    vramEstimateMB: number;
    recommendedModel: 'llama-3-8b' | 'phi-3-mini' | 'tiny-llama' | 'none';
    adapterInfo?: {
        vendor: string;
        architecture: string;
        description: string;
    };
}

export async function checkHardwareSupport(): Promise<HardwareStats> {
    const stats: HardwareStats = {
        hasWebGPU: false,
        hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        hasOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        vramEstimateMB: 0,
        recommendedModel: 'none'
    };

    if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
        return stats;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) {
            return stats;
        }

        // WebGPU adapter info is usually restricted behind permissions or 
        // gated by browsers, but we can try to get hints.
        // For VRAM, we can't get precise numbers yet in standard WebGPU,
        // so we use heuristics based on the device type.

        // requestAdapterInfo is part of the spec but implementation varies.
        let info = { vendor: 'unknown', architecture: 'unknown', description: 'unknown' };
        try {
            const adapterInfo = await adapter.requestAdapterInfo();
            info = {
                vendor: adapterInfo.vendor || 'unknown',
                architecture: adapterInfo.architecture || 'unknown',
                description: adapterInfo.description || 'unknown'
            };
        } catch {
            console.warn('Could not request adapter info');
        }

        // HEURISTIC: Estimate VRAM capability based on adapter limits
        // WebGPU limits say what we *can* allocate, not what is physical.
        const maxBuffer = adapter.limits.maxBufferSize;
        const vramEstimateMB = Math.floor(maxBuffer / (1024 * 1024));

        let recommendedModel: HardwareStats['recommendedModel'] = 'tiny-llama';

        // Heuristic thresholds
        if (vramEstimateMB >= 8000) {
            recommendedModel = 'llama-3-8b';
        } else if (vramEstimateMB >= 4000) {
            recommendedModel = 'phi-3-mini';
        }

        return {
            ...stats,
            hasWebGPU: true,
            vramEstimateMB,
            recommendedModel,
            adapterInfo: info
        };
    } catch (error) {
        console.error('Error checking WebGPU support:', error);
        return stats;
    }
}
