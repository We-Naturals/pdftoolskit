
export class ScannerService {
    private device: USBDevice | null = null;

    // Standard ESC/POS or common scanner vendor IDs
    private filters = [
        // { vendorId: 0x04b8 }, // Epson
        // { vendorId: 0x0483 }, // STMicroelectronics (common for generic MCU)
    ];
    // Allowing all devices for discovery in this demo phase, specific filters usually required

    async connect(): Promise<boolean> {
        try {
            this.device = await navigator.usb.requestDevice({ filters: [] });
            await this.device.open();
            if (this.device.configuration === null) {
                await this.device.selectConfiguration(1);
            }
            await this.device.claimInterface(0);
            return true;
        } catch (error) {
            console.error('USB Connection failed:', error);
            // Fallback for demo if user cancels or no device
            return false;
        }
    }

    async scan(): Promise<Blob | null> {
        if (!this.device) {
            // Mock Mode: Return a sample image if no device connected (or for testing)
            console.warn('No device connected. Using Mock Scanner.');
            return this.getMockImage();
        }

        try {
            // Real implementation would send a command like ESC/POS 'Scan' or vendor specific
            // const data = new Uint8Array([0x1B, 0x40]); // Init
            // await this.device.transferOut(1, data);

            // Read data back (bulk transfer)
            // const result = await this.device.transferIn(1, 64);

            // Converting raw USB data to image is complex and device-specific.
            // For this 'Sovereign Core' MVP, we assume a device that sends a stream.

            // Simulate waiting for scan...
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.getMockImage(); // Returning mock even if "connected" since we don't have a real driver protocol implemented
        } catch (error) {
            console.error('Scan failed:', error);
            return null;
        }
    }

    private async getMockImage(): Promise<Blob> {
        // Create a canvas with a "Scanned Document" look
        const canvas = document.createElement('canvas');
        canvas.width = 595; // A4 approx
        canvas.height = 842;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add some "scanned" text
            ctx.fillStyle = '#000000';
            ctx.font = '20px Courier';
            ctx.fillText('SCANNED DOCUMENT', 50, 50);
            ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 50, 80);
            ctx.fillText('CONFIDENTIAL', 50, 110);

            // Add some noise/lines
            ctx.strokeStyle = '#cccccc';
            for (let i = 0; i < 10; i++) {
                ctx.beginPath();
                ctx.moveTo(0, Math.random() * canvas.height);
                ctx.lineTo(canvas.width, Math.random() * canvas.height);
                ctx.stroke();
            }
        }

        return new Promise(resolve => canvas.toBlob(blob => resolve(blob!)));
    }
}
