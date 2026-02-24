
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const id = formData.get('id') as string || uuidv4();

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Define storage path
        const tempDir = path.join(process.cwd(), 'data', 'temp');
        await mkdir(tempDir, { recursive: true });

        const fileName = `${id}-${file.name}`;
        const filePath = path.join(tempDir, fileName);

        await writeFile(filePath, buffer);

        // Generate a public-ish URL (for dev purposes)
        // In production, this would be a signed S3 URL
        const url = `/api/storage/download/${fileName}`;

        return NextResponse.json({
            success: true,
            id,
            url,
            expiresAt: Date.now() + 3600000 // 1 hour
        });
    } catch (error) {
        console.error('Storage Upload Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
