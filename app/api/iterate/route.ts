import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/db'
import { sessions, agentEvents }     from '@/db/schema'
import { eq }                        from 'drizzle-orm'
import { daytona }                   from '@/lib/daytona'
import { AGENT_PHASES }              from '@/lib/llmProviders'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    sessionId: string
    agentName: string
    feedback:  string
    apiKey:    string   // browser re-sends from localStorage — never stored in DB
  }

  const { sessionId, agentName, feedback, apiKey } = body

  if (!sessionId || !agentName || !apiKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Extend expiry on every iteration — active users never lose their sandbox
  const newExpiry = new Date(Date.now() + 45 * 60 * 1000)
  await db.update(sessions)
    .set({ expiresAt: newExpiry })
    .where(eq(sessions.id, sessionId))

  // Check if sandbox is still alive
  if (!session.sandboxId || new Date() > session.expiresAt) {
    return NextResponse.json(
      { error: 'sandbox_expired', message: 'Session expired. Please start a new swarm.' },
      { status: 410 }
    )
  }

  const agentPhase = AGENT_PHASES[agentName] ?? 2

  // Flip the card back to "Working" in the UI immediately
  await db.insert(agentEvents).values({
    sessionId,
    eventType: 'agent_started',
    agentName,
    phase:   agentPhase,
    message: `Re-running with feedback...`,
  })

  // Re-spawn just this agent — sandbox still alive, state files untouched
  // Fire and forget: the agent runs, posts events via webhook, we return now
  const sandbox = await daytona.get(session.sandboxId)
  const homeDir = await sandbox.getUserHomeDir()

  sandbox.process.executeCommand(
    `node ${homeDir}/node_modules/.bin/tsx ${homeDir}/agents/${agentName}.ts`,
    homeDir,
    {
      AGENT_PHASE:        String(agentPhase),
      ITERATION_FEEDBACK: feedback,
      LLM_API_KEY:        apiKey,
      // Remap the API key for pi-ai (same logic as orchestrator/index.ts)
      ...(session.llmProvider === 'openai'     && { OPENAI_API_KEY:     apiKey }),
      ...(session.llmProvider === 'anthropic'  && { ANTHROPIC_API_KEY:  apiKey }),
      ...(session.llmProvider === 'openrouter' && { OPENROUTER_API_KEY: apiKey }),
    },
    0  // no timeout — fire and forget
  ).catch(err => console.error('[iterate] spawn error:', err))

  return NextResponse.json({ ok: true })
}
