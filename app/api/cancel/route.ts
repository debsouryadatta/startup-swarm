import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/db'
import { sessions, agentEvents }     from '@/db/schema'
import { daytona }                   from '@/lib/daytona'
import { auth }                      from '@/auth'
import { eq }                        from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const authSession = await auth()
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await req.json() as { sessionId: string }

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.userId !== authSession.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Update status to cancelled
  await db.update(sessions)
    .set({ status: 'cancelled' })
    .where(eq(sessions.id, sessionId))

  // Write a cancellation event so the SSE stream picks it up
  await db.insert(agentEvents).values({
    sessionId,
    eventType: 'swarm_cancelled',
    message:   'Session was cancelled by user.',
  })

  // Best-effort: stop the sandbox
  if (session.sandboxId) {
    try {
      const sandbox = await daytona.get(session.sandboxId)
      await sandbox.delete().catch(() => {})
    } catch {
      // Sandbox may already be gone — ignore
    }
  }

  return NextResponse.json({ ok: true })
}
