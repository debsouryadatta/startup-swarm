import { NextRequest, NextResponse } from 'next/server'
import { randomBytes }               from 'crypto'
import * as nodePath                 from 'path'
import * as nodeFs                   from 'fs/promises'
import { db }                             from '@/db'
import { sessions, users, PLAN_LIMITS }   from '@/db/schema'
import { daytona }                        from '@/lib/daytona'
import { auth }                           from '@/auth'
import { eq }                             from 'drizzle-orm'

export const maxDuration = 10  // Hobby tier — returns as soon as sandbox is ready

// Read all files under a directory recursively, returning { localPath, relativePath }
async function readDirRecursive(dir: string): Promise<Array<{ localPath: string; relativePath: string }>> {
  const entries = await nodeFs.readdir(dir, { withFileTypes: true })
  const results: Array<{ localPath: string; relativePath: string }> = []

  for (const entry of entries) {
    const fullPath = nodePath.join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await readDirRecursive(fullPath)
      results.push(...nested)
    } else {
      results.push({
        localPath:    fullPath,
        relativePath: nodePath.relative(
          nodePath.join(process.cwd(), 'orchestrator'),
          fullPath
        ),
      })
    }
  }
  return results
}

export async function POST(req: NextRequest) {
  // Require authentication
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json() as {
    sessionId:      string
    idea:           string
    selectedAgents: string[]
    llmProvider:    string
    llmModel:       string
  }

  const { sessionId, idea, selectedAgents, llmProvider, llmModel } = body

  // Basic validation
  if (!idea || !sessionId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Resolve API key server-side from env based on the chosen provider
  const apiKeyMap: Record<string, string | undefined> = {
    openai:     process.env.OPENAI_API_KEY,
    anthropic:  process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  }
  const apiKey = apiKeyMap[llmProvider] ?? ''

  // ── Plan limit check ──────────────────────────────────────────────────────
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const plan  = (user.plan ?? 'hobby') as keyof typeof PLAN_LIMITS
  const limit = PLAN_LIMITS[plan] ?? 3
  let   runsUsed   = user.runsUsed   ?? 0
  let   runsResetAt = user.runsResetAt

  // Monthly reset for paid plans
  if (plan !== 'hobby') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    if (!runsResetAt || runsResetAt < thirtyDaysAgo) {
      runsUsed    = 0
      runsResetAt = new Date()
      await db.update(users).set({ runsUsed: 0, runsResetAt }).where(eq(users.id, userId))
    }
  }

  if (runsUsed >= limit) {
    const msg = plan === 'hobby'
      ? `You have used all ${limit} free runs. Upgrade to Builder (₹1,999/mo) to continue.`
      : `You have used all ${limit} runs this month. Upgrade to Studio (₹3,999/mo) for unlimited.`
    return NextResponse.json({ error: msg, upgradeRequired: true }, { status: 403 })
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Check if user already has an active session (prevent duplicate sandboxes)
  const existing = await db.query.sessions.findFirst({
    where: (s, { eq, and, inArray }) =>
      and(eq(s.userId, userId), inArray(s.status, ['spawning', 'running'])),
  })
  if (existing) {
    return NextResponse.json({ error: 'You already have an active swarm running', existingSessionId: existing.id }, { status: 409 })
  }

  const webhookSecret = randomBytes(32).toString('hex')
  const expiresAt     = new Date(Date.now() + 45 * 60 * 1000)  // 45 minutes

  // Persist session row before touching Daytona (so we can always look it up)
  await db.insert(sessions).values({
    id:             sessionId,
    userId,
    idea,
    selectedAgents,
    llmProvider,
    llmModel,
    webhookSecret,
    status:         'spawning',
    expiresAt,
  })

  const appBaseUrl  = process.env.APP_BASE_URL!
  const webhookUrl  = `${appBaseUrl}/api/webhook/${sessionId}`

  let sandboxId: string | undefined

  try {
    // Create the sandbox — auto-stop after 20 min idle (safety net; webhook deletes it earlier on completion)
    const sandbox = await daytona.create({
      autoStopInterval: 20,
      envVars: {
        IDEA:             idea,
        SESSION_ID:       sessionId,
        SELECTED_AGENTS:  selectedAgents.join(','),
        LLM_PROVIDER:     llmProvider,
        LLM_MODEL:        llmModel,
        LLM_API_KEY:      apiKey,       // never stored in DB
        // Set the provider-specific key name so pi-ai's getEnvApiKey() picks it up
        // e.g. anthropic → ANTHROPIC_API_KEY, openai → OPENAI_API_KEY
        [`${llmProvider.toUpperCase()}_API_KEY`]: apiKey,
        WEBHOOK_URL:      webhookUrl,
        WEBHOOK_SECRET:   webhookSecret,
      },
    })

    sandboxId = sandbox.id

    await db.update(sessions)
      .set({ sandboxId, status: 'running' })
      .where(eq(sessions.id, sessionId))

    // Increment run counter
    await db.update(users)
      .set({ runsUsed: runsUsed + 1 })
      .where(eq(users.id, userId))

    // Get the actual writable home directory (e.g. /home/daytona)
    const homeDir = await sandbox.getUserHomeDir()

    // Create required subdirectories
    await sandbox.fs.createFolder(`${homeDir}/agents`, '755')
    await sandbox.fs.createFolder(`${homeDir}/shared`, '755')
    await sandbox.fs.createFolder(`${homeDir}/state`,  '755')

    // Upload orchestrator files — skip OS noise files like .DS_Store
    const orchestratorDir = nodePath.join(process.cwd(), 'orchestrator')
    const files           = await readDirRecursive(orchestratorDir)
    const uploadable      = files.filter(f => !f.relativePath.includes('.DS_Store'))

    await sandbox.fs.uploadFiles(
      await Promise.all(
        uploadable.map(async f => ({
          source:      await nodeFs.readFile(f.localPath),  // Buffer, not path string
          destination: `${homeDir}/${f.relativePath}`,      // SDK wraps Buffer in Blob on serverless
        }))
      )
    )

    // Install deps + start the orchestrator in one background shell command.
    // We do NOT await this — it runs entirely inside the Daytona sandbox.
    // The Vercel function returns immediately; events arrive via webhook.
    sandbox.process.executeCommand(
      `sh -c "cd ${homeDir} && npm install >> /tmp/run.log 2>&1 && node node_modules/.bin/tsx index.ts >> /tmp/run.log 2>&1"`,
      homeDir,
      undefined,
      0   // timeout=0 → fire-and-forget
    ).catch(err => console.error('[spawn] start error:', err))

    return NextResponse.json({ sessionId })

  } catch (err) {
    console.error('[spawn] error:', err)
    // Mark session as errored so the dashboard shows something useful
    await db.update(sessions)
      .set({ status: 'error' })
      .where(eq(sessions.id, sessionId))

    return NextResponse.json({ error: 'Failed to start swarm' }, { status: 500 })
  }
}
