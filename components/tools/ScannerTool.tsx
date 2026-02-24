/* eslint-disable */

'use client';

import React, { useState } from 'react';
import { Printer, RefreshCw, Upload, Usb } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button'; // Fixed import path
import { GlassCard } from '@/components/ui/GlassCard';
import { ScannerService } from '@/lib/services/hardware/ScannerService';
// import { downloadFile } from '@/lib/utils';
import { useEditStore } from '@/lib/stores/edit-store';

export function ScannerTool() {
    const [service] = useState(() => new ScannerService());
    const [connected, setConnected] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scannedImage, setScannedImage] = useState<string | null>(null);

    const handleConnect = async () => {
        try {
            // Note: Must be triggered by user gesture
            const success = await service.connect();
            setConnected(success);
            if (success) {
                toast.success('Scanner Connected');
            } else {
                toast('Mock Scanner Mode Active (No device selected)');
                // We allow continuing in "Mock Mode" for verification transparency
                setConnected(true);
            }
        } catch (_error) {
            console.error(_error);
            toast.error('Failed to connect');
        }
    };

    const handleScan = async () => {
        setScanning(true);
        const toastId = toast.loading('Acquiring image...');
        try {
            const blob = await service.scan();
            if (blob) {
                const url = URL.createObjectURL(blob);
                setScannedImage(url);
                toast.success('Scan Complete!', { id: toastId });
            } else {
                toast.error('Scan failed', { id: toastId });
            }
        } catch (_error) {
            toast.error('Scan error', { id: toastId });
        } finally {
            setScanning(false);
        }
    };

    const handleAddToCanvas = () => {
        if (!scannedImage) return;
        // Logic to add to active editor page
        // Use Global Store directly for now
        const activePage = useEditStore.getState().activePageId;
        if (activePage) {
            const id = crypto.randomUUID();
            useEditStore.getState().addObject(activePage, {
                id,
                type: 'image',
                src: scannedImage,
                x: 100,
                y: 100,
                width: 300,
                height: 400
            });
            toast.success('Added to Canvas');
        } else {
            toast.error('Open a document in the Editor first');
        }
    };

    const handleDownload = () => {
        if (!scannedImage) return;
        const link = document.createElement('a');
        link.href = scannedImage;
        link.download = `scan_${Date.now()}.png`;
        link.click();
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
            <GlassCard className="w-full p-8 flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center relative">
                    <Printer className={`w-10 h-10 ${connected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    {connected && (
                        <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
                    )}
                </div>

                <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">WebUSB Direct</h3>
                    <p className="text-slate-400">
                        Connect compatible scanners directly to the browser.
                    </p>
                </div>

                {!connected ? (
                    <Button
                        onClick={handleConnect}
                        className="w-full bg-cyan-600 hover:bg-cyan-500"
                        icon={<Usb className="w-4 h-4" />}
                    >
                        Connect Scanner
                    </Button>
                ) : (
                    <div className="w-full space-y-4">
                        <Button
                            onClick={handleScan}
                            disabled={scanning}
                            loading={scanning}
                            variant="primary"
                            className="w-full"
                            icon={<RefreshCw className="w-4 h-4" />}
                        >
                            {scanning ? 'Scanning...' : 'Acquire Image'}
                        </Button>
                    </div>
                )}
            </GlassCard>

            {scannedImage && (
                <GlassCard className="w-full p-4 animate-in fade-in slide-up">
                    <div className="relative w-full h-64 mb-4 bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={scannedImage}
                            alt="Scanned"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleAddToCanvas} className="flex-1" icon={<Upload className="w-4 h-4" />}>
                            Add to Canvas
                        </Button>
                        <Button onClick={handleDownload} variant="secondary" icon={<Printer className="w-4 h-4" />}>
                            Download
                        </Button>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}

