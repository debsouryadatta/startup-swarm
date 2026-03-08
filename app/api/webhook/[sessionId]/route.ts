import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/db'
import { sessions, agentEvents, agentOutputs } from '@/db/schema'
import { eq }                        from 'drizzle-orm'
import { daytona }                   from '@/lib/daytona'
import { createClient }              from '@supabase/supabase-js'
import JSZip                         from 'jszip'

interface WebhookBody {
  secret:     string
  eventType:  string
  agentName?: string
  phase?:     number
  chunk?:     string
  message?:   string
  payload?:   Record<string, unknown>
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const body = await req.json() as WebhookBody

  // Validate webhook secret
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })

  if (!session || body.secret !== session.webhookSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (new Date() > session.expiresAt) {
    return NextResponse.json({ error: 'Session expired' }, { status: 410 })
  }

  // Insert the event — SSE will pick this up on next poll
  await db.insert(agentEvents).values({
    sessionId,
    eventType: body.eventType,
    agentName: body.agentName ?? null,
    phase:     body.phase    ?? null,
    chunk:     body.chunk    ?? null,
    message:   body.message  ?? null,
    payload:   body.payload  ?? null,
  })

  // Persist structured agent output when an agent finishes
  if (body.eventType === 'agent_done' && body.agentName && body.payload?.output) {
    await db.insert(agentOutputs).values({
      sessionId,
      agentName: body.agentName,
      output:    body.payload.output as Record<string, unknown>,
    })
  }

  // Swarm finished — zip state files, mark complete, and destroy the sandbox.
  // Each step is independent so a zip failure doesn't block sandbox cleanup.
  if (body.eventType === 'swarm_complete' && session.sandboxId) {
    // 1. Best-effort zip + upload — failure is non-fatal
    let downloadUrl: string | null = null
    try {
      downloadUrl = await zipAndUpload(session.sandboxId, sessionId)
      await db.insert(agentEvents).values({
        sessionId,
        eventType: 'download_ready',
        payload:   { downloadUrl },
      })
    } catch (err) {
      console.error('[webhook] zip/upload error (non-fatal):', err)
    }

    // 2. Always mark the session complete (with or without a download URL)
    await db.update(sessions)
      .set({ status: 'complete', ...(downloadUrl ? { downloadUrl } : {}) })
      .where(eq(sessions.id, sessionId))

    // 3. Always delete the sandbox — never leave it running after completion
    try {
      const sandbox = await daytona.get(session.sandboxId)
      await sandbox.delete().catch(() => {/* sandbox may already be gone */})
    } catch (err) {
      console.error('[webhook] sandbox delete error (non-fatal):', err)
    }
  }

  return NextResponse.json({ ok: true })
}

async function zipAndUpload(sandboxId: string, sessionId: string): Promise<string> {
  const sandbox = await daytona.get(sandboxId)
  const homeDir = await sandbox.getUserHomeDir()
  const stateDir = `${homeDir}/state`

  // Download all .json files from $HOME/state/ and zip them
  const stateFiles = await sandbox.fs.listFiles(stateDir)
  const zip        = new JSZip()

  for (const file of stateFiles) {
    if (!file.name.endsWith('.json')) continue
    const buffer = await sandbox.fs.downloadFile(`${stateDir}/${file.name}`)
    zip.file(file.name, buffer)
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

  // Upload to Supabase Storage (bucket: startup-kits, must be public)
  const supabase  = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const fileName  = `startup-kit-${sessionId}.zip`

  const { error } = await supabase.storage
    .from('startup-kits')
    .upload(fileName, zipBuffer, { contentType: 'application/zip', upsert: true })

  if (error) throw new Error(`Supabase upload failed: ${error.message}`)

  const { data } = supabase.storage.from('startup-kits').getPublicUrl(fileName)
  return data.publicUrl
}
