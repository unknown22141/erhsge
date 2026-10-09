import { NextResponse } from 'next/server';
import { getResults, runDue, startScheduler, syncJobs } from '@/server/scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// the browser sends every scheduled post, the server publishes them when they are due
export async function PUT(req: Request) {
  startScheduler();
  const { jobs = [], webhooks = [] } = await req.json();
  const count = await syncJobs(jobs, webhooks);
  runDue().catch(() => {});
  return NextResponse.json({ queued: count });
}

export async function GET() {
  startScheduler();
  return NextResponse.json({ results: await getResults() });
}
