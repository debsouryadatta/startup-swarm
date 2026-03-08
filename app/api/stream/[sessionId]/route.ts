import { NextRequest } from 'next/server'
import { db }          from '@/db'
import { agentEvents } from '@/db/schema'
import { eq, gt, and } from 'drizzle-orm'

// Polls Postgres for new agent_events and streams them to the browser via SSE.
// On reconnect (tab reload), replays ALL existing events so the dashboard
// can reconstruct its state from scratch.

export const maxDuration = 10

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const encoder       = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastSeenId = 0

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Controller already closed
        }
      }

      let closed = false
      let interval: ReturnType<typeof setInterval> | undefined
      let heartbeat: ReturnType<typeof setInterval> | undefined

      const close = () => {
        if (closed) return
        closed = true
        try { controller.close() } catch {}
        clearInterval(interval)
        clearInterval(heartbeat)
      }

      // Flush headers immediately so the browser fires EventSource.onopen
      // without waiting for the first real data chunk.
      try { controller.enqueue(encoder.encode(': ping\n\n')) } catch {}

      // Keep-alive heartbeat — prevents proxies / Vercel from closing idle streams
      heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')) } catch {}
      }, 20_000)

      // Helper: tell client to close its EventSource cleanly (prevents auto-reconnect loop)
      const sendEnd = () => {
        send({ eventType: 'stream_end' })
        close()
      }

      // Replay all existing events on connect (handles tab reload mid-run)
      const existing = await db.select()
        .from(agentEvents)
        .where(eq(agentEvents.sessionId, sessionId))
        .orderBy(agentEvents.id)

      let foundEnd = false
      for (const row of existing) {
        send(row)
        lastSeenId = row.id
        if (row.eventType === 'download_ready') { foundEnd = true; break }
        if (row.eventType === 'swarm_complete')  { foundEnd = true; break }
      }

      if (foundEnd) {
        // Session already complete — tell client to close, no need to poll
        sendEnd()
        return
      }

      // Poll for new events every 500ms
      interval = setInterval(async () => {
        if (closed) return
        try {
          const rows = await db.select()
            .from(agentEvents)
            .where(and(
              eq(agentEvents.sessionId, sessionId),
              gt(agentEvents.id, lastSeenId)
            ))
            .orderBy(agentEvents.id)

          for (const row of rows) {
            send(row)
            lastSeenId = row.id
            if (row.eventType === 'download_ready' || row.eventType === 'swarm_complete') {
              sendEnd()
              return
            }
          }
        } catch (err) {
          console.error('[stream] poll error:', err)
        }
      }, 500)

      // Clean up when browser disconnects
      req.signal.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
    },
  })
}
