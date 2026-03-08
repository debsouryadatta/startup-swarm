import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/db'
import { sessions, agentEvents, agentOutputs } from '@/db/schema'
import { daytona }                   from '@/lib/daytona'
import { auth }                      from '@/auth'
import { eq, desc }                  from 'drizzle-orm'

// GET — returns current session snapshot for instant dashboard hydration on load/refresh
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await auth()
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.userId !== authSession.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Latest structured outputs per agent
  const outputs = await db.select()
    .from(agentOutputs)
    .where(eq(agentOutputs.sessionId, sessionId))

  // Recent events — used for phase info AND to detect agents that finished
  // without a structured output (e.g. JSON parsing failed but agent still ran)
  const recentEvents = await db.select()
    .from(agentEvents)
    .where(eq(agentEvents.sessionId, sessionId))
    .orderBy(desc(agentEvents.id))
    .limit(200)

  const activePhase = recentEvents
    .find(e => e.eventType === 'phase_started')?.phase ?? 0

  // Build output map from DB-stored structured outputs
  const outputMap = outputs.reduce<Record<string, Record<string, unknown> | null>>((acc, o) => {
    acc[o.agentName] = (o.output as Record<string, unknown> | null) ?? null
    return acc
  }, {})

  // For every agent_done event, ensure the agent appears in the map even if
  // it has no structured output (so the dashboard shows "done" not "queued")
  for (const ev of recentEvents) {
    if (ev.eventType === 'agent_done' && ev.agentName) {
      const key = ev.agentName === 'ceoOrchestrator' && ev.phase === 4
        ? 'ceoOrchestrator_4'
        : ev.agentName
      if (!(key in outputMap)) {
        // Use payload output if present, otherwise mark as completed with null
        const payloadOutput = (ev.payload as Record<string, unknown> | null)?.output
        outputMap[key] = (payloadOutput as Record<string, unknown> | undefined) ?? null
      }
    }
  }

  const lastEventId = recentEvents[0]?.id ?? 0

  return NextResponse.json({
    status:         session.status,
    downloadUrl:    session.downloadUrl ?? null,
    activePhase,
    outputs:        outputMap,
    isDone:         session.status === 'complete',
    isCancelled:    session.status === 'cancelled',
    idea:           session.idea,
    llmProvider:    session.llmProvider,
    llmModel:       session.llmModel,
    selectedAgents: session.selectedAgents,
    lastEventId,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await auth()
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.userId !== authSession.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Best-effort: destroy the sandbox before removing DB rows
  if (session.sandboxId) {
    try {
      const sandbox = await daytona.get(session.sandboxId)
      await sandbox.delete().catch(() => {})
    } catch {
      // Sandbox may already be gone — ignore
    }
  }

  // Delete all agent events first (FK constraint)
  await db.delete(agentEvents).where(eq(agentEvents.sessionId, sessionId))

  // Delete the session row
  await db.delete(sessions).where(eq(sessions.id, sessionId))

  return NextResponse.json({ ok: true })
}
