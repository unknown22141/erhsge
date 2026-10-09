import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const id: string = ((globalThis as any).__postizInstance ||= Math.random().toString(36).slice(2));

export async function GET() {
  return NextResponse.json({ ok: true, id });
}
