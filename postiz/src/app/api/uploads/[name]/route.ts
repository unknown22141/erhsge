import { promises as fs } from 'fs';
import path from 'path';
import { uploadsDir } from '@/server/storage';

export const runtime = 'nodejs';

const types: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = path.basename((await params).name);
  try {
    const file = await fs.readFile(path.join(uploadsDir, name));
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': types[name.split('.').pop()!.toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
