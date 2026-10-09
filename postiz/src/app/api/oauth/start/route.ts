import { NextResponse } from 'next/server';
import { getServerProvider } from '@/server/providers';
import { createState } from '@/server/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// returns the platform sign-in page for this app's keys
export async function POST(req: Request) {
  const { identifier, credentials, redirectUri, returnTo } = await req.json();
  try {
    const provider = getServerProvider(identifier);
    if (!provider.oauth) throw new Error(`${identifier} does not use sign in`);
    const state = createState(identifier, credentials || {}, redirectUri, /^https?:\/\//.test(returnTo || '') ? returnTo : '');
    return NextResponse.json({ url: provider.oauth.authUrl(credentials || {}, redirectUri, state), state });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Could not start the sign in' }, { status: 400 });
  }
}
