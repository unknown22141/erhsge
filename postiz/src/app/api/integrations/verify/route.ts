import { NextResponse } from 'next/server';
import { getServerProvider } from '@/server/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// checks the credentials against the platform and returns the account
export async function POST(req: Request) {
  const { identifier, credentials } = await req.json();
  try {
    const provider = getServerProvider(identifier);
    if (!provider.verify) throw new Error(`${identifier} connects with "Sign in"`);
    const info = await provider.verify(credentials || {});
    return NextResponse.json(info);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Could not connect the channel' }, { status: 400 });
  }
}
