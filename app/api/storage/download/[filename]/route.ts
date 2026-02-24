
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
    req: NextRequest,
    { params }: { params: { filename: string } }
) {
    try {
        const { filename } = params;
        const filePath = path.join(process.cwd(), 'data', 'temp', filename);

        const buffer = await readFile(filePath);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf', // Default, should ideally be stored in metadata
                'Content-Disposition': `attachment; filename="${filename.split('-').slice(1).join('-')}"`,
            },
        });
    } catch (_error) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
}
