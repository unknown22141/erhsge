import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { uploadsDir } from '@/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'No file' }, { status: 400 });
  }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ path: `/api/uploads/${name}` });
}
