import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// checks that the public address really reaches this app
export async function POST(req: Request) {
  const { url } = await req.json();
  if (!/^https:\/\//.test(url || '')) {
    return NextResponse.json({ ok: false, message: 'The public URL must start with https://' });
  }
  try {
    const own = (globalThis as any).__postizInstance;
    const res = await fetch(`${url.replace(/\/$/, '')}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    if (own && data.id !== own) {
      return NextResponse.json({ ok: false, message: 'This address answers, but it is not this app' });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: `Could not reach ${url}: ${e?.message || e}` });
  }
}
