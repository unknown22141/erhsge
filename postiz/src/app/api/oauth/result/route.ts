import { NextResponse } from 'next/server';
import { takeResult } from '@/server/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get('state') || '';
  const item = takeResult(state);
  if (!item) return NextResponse.json({ message: 'The sign in expired, please try again' }, { status: 404 });
  if (item.error) return NextResponse.json({ message: item.error }, { status: 400 });
  return NextResponse.json({ identifier: item.identifier, ...item.result, credentials: item.result?.credentials || item.credentials });
}
