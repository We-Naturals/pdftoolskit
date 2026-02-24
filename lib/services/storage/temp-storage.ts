
import { v4 as uuidv4 } from 'uuid';

export interface TempFile {
    id: string;
    fileName: string;
    url: string;
    expiresAt: number;
}

class TempStorageService {
    private readonly TTL = 1000 * 60 * 60; // 1 hour

    /**
     * Uploads a file to a temporary storage location.
     * In a real production app, this would upload to S3 or Vercel Blob.
     * For this project, we'll use a local API route placeholder.
     */
    async upload(file: File): Promise<TempFile> {
        const id = uuidv4();
        const expiresAt = Date.now() + this.TTL;

        // Create FormData and upload to internal API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', id);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.statusText}`);
        }

        const data = await response.json();

        return {
            id,
            fileName: file.name,
            url: data.url, // The server returns a downloadable URL
            expiresAt,
        };
    }

    /**
     * Fetches a file from temporary storage as a Blob.
     */
    async download(url: string): Promise<Blob> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download file from ${url}`);
        }
        return await response.blob();
    }

    /**
     * Request the server to clean up expired files.
     * This would typically be a cron job on the server.
     */
    async cleanup(): Promise<void> {
        await fetch('/api/storage/cleanup', { method: 'POST' });
    }
}

export const tempStorage = new TempStorageService();
