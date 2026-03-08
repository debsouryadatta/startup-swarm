import { NextRequest, NextResponse } from 'next/server'
import { db }        from '@/db'
import { sessions }  from '@/db/schema'
import { daytona }   from '@/lib/daytona'
import { eq }        from 'drizzle-orm'

export const maxDuration = 10

// DEV-ONLY debug endpoint — reads sandbox run.log and state files
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { sessionId } = await params
  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) })
  if (!session?.sandboxId) {
    // Return last session if no sessionId match
    const last = await db.query.sessions.findFirst()
    return NextResponse.json({ error: 'No sandbox found', lastSession: last }, { status: 404 })
  }

  try {
    const sandbox = await daytona.get(session.sandboxId)
    const homeDir = await sandbox.getUserHomeDir()

    const [log, state, tsx, pkgJson] = await Promise.all([
      sandbox.process.executeCommand(`tail -80 /tmp/run.log 2>/dev/null || echo "[no log yet]"`, homeDir, undefined, 15),
      sandbox.process.executeCommand(`ls ${homeDir}/state/ 2>/dev/null || echo "[no state dir]"`, homeDir, undefined, 5),
      sandbox.process.executeCommand(`${homeDir}/node_modules/.bin/tsx --version 2>/dev/null || echo "tsx not found"`, homeDir, undefined, 5),
      sandbox.process.executeCommand(`cat ${homeDir}/package.json 2>/dev/null || echo "no package.json"`, homeDir, undefined, 5),
    ])

    return NextResponse.json({
      sandboxId: session.sandboxId,
      status: session.status,
      runLog: log.result,
      stateFiles: state.result,
      tsxVersion: tsx.result,
      packageJson: pkgJson.result,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
