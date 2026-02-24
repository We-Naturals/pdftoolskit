import React, { useEffect, useRef, useState, memo } from 'react';
import Image from 'next/image';
import { usePDFWorker } from '@/lib/hooks/use-pdf-worker';
import { cn } from '@/lib/utils';
import { Loader2, Check, RotateCw } from 'lucide-react';
import { PDFPage } from '@/lib/stores/file-store';

interface GridItemProps {
    page: PDFPage;
    width: number;
    height: number;
    isSelected: boolean;
    onSelect: (modifiers: { shiftKey: boolean; ctrlKey: boolean }) => void;
    onRotate?: (direction: 'cw' | 'ccw') => void;
}

export const GridItem = memo(function GridItem({
    page,
    width,
    height,
    isSelected,
    onSelect,
    onRotate
}: GridItemProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { renderPage } = usePDFWorker();

    useEffect(() => {
        let isCancelled = false;

        const loadThumbnail = async () => {
            if (!page.fileId) return;

            setLoading(true);
            setError(false);

            try {
                // Calculate scale to fit width/height while maintaining aspect ratio
                // For now, we assume a standard A4 ratio or fit to width
                // A better approach is to request a specific width from the worker

                // We request a bitmap that fits the container width
                // The worker handles the scaling based on the viewport
                const scale = width / 200; // Base scale on 200px reference

                const bitmap = await renderPage(page.fileId, page.pageIndex + 1, scale, page.rotation);

                if (isCancelled) {
                    if (bitmap) bitmap.close();
                    return;
                }

                if (canvasRef.current && bitmap) {
                    canvasRef.current.width = bitmap.width;
                    canvasRef.current.height = bitmap.height;
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(bitmap, 0, 0);
                    }
                    bitmap.close(); // Transfer complete, release memory
                }
                setLoading(false);
            } catch (err) {
                if (!isCancelled) {
                    console.error('Failed to render thumbnail:', err);
                    setError(true);
                    setLoading(false);
                }
            }
        };

        loadThumbnail();

        return () => {
            isCancelled = true;
        };
    }, [page.fileId, page.pageIndex, page.rotation, width, renderPage]);

    return (
        <div
            className={cn(
                "relative group transition-all duration-200 p-2",
                isSelected ? "z-10" : "z-0"
            )}
            style={{ width, height }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect({ shiftKey: e.shiftKey, ctrlKey: e.ctrlKey || e.metaKey });
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect({ shiftKey: e.shiftKey, ctrlKey: e.ctrlKey || e.metaKey });
                }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Page ${page.pageIndex + 1}`}
            aria-pressed={isSelected}
        >
            <div className={cn(
                "w-full h-full rounded-lg overflow-hidden shadow-sm bg-white border-2 relative transition-colors flex flex-col",
                isSelected ? "border-blue-500 shadow-blue-500/20" : "border-slate-200 hover:border-blue-300"
            )}>
                {/* Canvas Container */}
                <div className="flex-1 relative bg-slate-50 flex items-center justify-center overflow-hidden">
                    {page.imageUrl ? (
                        <Image
                            src={page.imageUrl}
                            alt={`Asset ${page.pageIndex + 1}`}
                            width={width}
                            height={height}
                            className="max-w-full max-h-full object-contain shadow-sm"
                            onLoad={() => setLoading(false)}
                            onError={() => setError(true)}
                        />
                    ) : (
                        <>
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            )}
                            {error && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 text-red-400 text-xs font-medium">
                                    Error
                                </div>
                            )}

                            <canvas
                                ref={canvasRef}
                                className={cn(
                                    "max-w-full max-h-full object-contain shadow-sm transition-opacity duration-500",
                                    loading ? "opacity-0" : "opacity-100"
                                )}
                            />
                        </>
                    )}

                    {/* Selection Overlay */}
                    {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center pointer-events-none">
                            <div className="bg-blue-500 text-white rounded-full p-1 shadow-sm">
                                <Check className="w-4 h-4" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="h-8 bg-white border-t border-slate-100 flex items-center justify-between px-2 text-xs text-slate-500">
                    <span className="font-medium">#{page.pageIndex + 1}</span>

                    {/* Hover Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onRotate && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRotate('cw');
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-slate-600"
                                title="Rotate"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
});
