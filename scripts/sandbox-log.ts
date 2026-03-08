import { Daytona } from '@daytonaio/sdk'
import postgres from 'postgres'

const SESSION_ID = process.argv[2]
if (!SESSION_ID) { console.error('Usage: pnpm tsx scripts/sandbox-log.ts <sessionId>'); process.exit(1) }

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL,
  organizationId: process.env.DAYTONA_ORGANIZATION_ID,
  target: process.env.DAYTONA_TARGET ?? 'us',
})

const sql = postgres(process.env.DATABASE_URL!)

const [session] = await sql`SELECT sandbox_id FROM sessions WHERE id = ${SESSION_ID} LIMIT 1`
if (!session?.sandbox_id) {
  // Try last session
  const [last] = await sql`SELECT id, sandbox_id, status FROM sessions ORDER BY created_at DESC LIMIT 1`
  console.log('Last session:', last)
  await sql.end()
  process.exit(1)
}

console.log('Sandbox ID:', session.sandbox_id)
const sandbox = await daytona.get(session.sandbox_id)
const homeDir = await sandbox.getUserHomeDir()

const log = await sandbox.process.executeCommand(`cat /tmp/run.log 2>/dev/null | tail -100`, homeDir, undefined, 15)
console.log('\n=== /tmp/run.log (last 100 lines) ===')
console.log(log.result ?? log.exitCode)

const stateFiles = await sandbox.process.executeCommand(`ls -la ${homeDir}/state/ 2>/dev/null && echo "---" && for f in ${homeDir}/state/*.json; do echo "=== $f ==="; cat "$f" | head -5; echo; done`, homeDir, undefined, 10)
console.log('\n=== State files ===')
console.log(stateFiles.result)

await sql.end()
