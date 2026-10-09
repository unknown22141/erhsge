import { NextResponse } from 'next/server';
import { ackResults } from '@/server/scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { ids = [] } = await req.json();
  await ackResults(ids);
  return NextResponse.json({ ok: true });
}
