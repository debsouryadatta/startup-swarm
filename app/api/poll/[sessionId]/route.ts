import { NextRequest, NextResponse } from 'next/server'
import { db }          from '@/db'
import { agentEvents } from '@/db/schema'
import { eq, gt, and } from 'drizzle-orm'

// Short-polling endpoint — replaces SSE for Vercel Hobby compatibility.
// Client calls GET /api/poll/[sessionId]?after=<lastId> every ~2 seconds.
// Returns immediately with any new events (no waiting, no held connection).

export const maxDuration = 10

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const afterParam    = req.nextUrl.searchParams.get('after')
  const after         = afterParam ? parseInt(afterParam, 10) : 0

  const rows = await db.select()
    .from(agentEvents)
    .where(and(
      eq(agentEvents.sessionId, sessionId),
      gt(agentEvents.id, after)
    ))
    .orderBy(agentEvents.id)
    .limit(100)   // cap per-request to avoid oversized payloads mid-run

  const terminalEvents = new Set(['swarm_complete', 'swarm_cancelled', 'download_ready'])
  const done = rows.some(r => terminalEvents.has(r.eventType))

  return NextResponse.json(
    { events: rows, done },
    // Short cache so browsers don't deduplicate rapid requests
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
