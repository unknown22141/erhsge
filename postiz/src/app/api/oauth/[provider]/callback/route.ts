import { getServerProvider } from '@/server/providers';
import { getPending } from '@/server/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// the platform sends the user back here after the sign in
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code');
  const pending = getPending(state);
  const back = (query: string) =>
    new Response(null, { status: 302, headers: { Location: `${pending?.returnTo || ''}/launches?${query}` } });

  if (!pending || pending.identifier !== provider) {
    return back(`oauth_error=${encodeURIComponent('The sign in expired, please try again')}`);
  }
  if (!code) {
    pending.error = url.searchParams.get('error_description') || url.searchParams.get('error') || 'The sign in was cancelled';
    return back(`oauth=${state}`);
  }
  try {
    pending.result = await getServerProvider(provider).oauth!.exchange(pending.credentials, code, pending.redirectUri);
  } catch (e: any) {
    pending.error = e?.message || 'Could not connect the channel';
  }
  return back(`oauth=${state}`);
}
