export { };

declare global {
    interface Navigator {
        usb: USB;
    }

    interface USB {
        requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
        getDevices(): Promise<USBDevice[]>;
    }

    interface USBDeviceRequestOptions {
        filters: USBDeviceFilter[];
    }

    interface USBDeviceFilter {
        vendorId?: number;
        productId?: number;
        classCode?: number;
        subclassCode?: number;
        protocolCode?: number;
        serialNumber?: string;
    }

    interface USBDevice {
        productName?: string;
        manufacturerName?: string;
        serialNumber?: string;
        open(): Promise<void>;
        close(): Promise<void>;
        selectConfiguration(configurationValue: number): Promise<void>;
        claimInterface(interfaceNumber: number): Promise<void>;
        configuration: USBConfiguration | null;
    }

    interface USBConfiguration {
        configurationValue: number;
    }
}
