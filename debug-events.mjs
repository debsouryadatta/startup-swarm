import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { agentEvents, agentOutputs } from './db/schema.js'
import { eq, desc } from 'drizzle-orm'

const SESSION_ID = process.argv[2]
if (!SESSION_ID) { console.error('Usage: node debug-events.mjs <sessionId>'); process.exit(1) }

const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client)

const events = await db.select().from(agentEvents)
  .where(eq(agentEvents.sessionId, SESSION_ID))
  .orderBy(desc(agentEvents.id))
  .limit(30)

console.log('\n=== LAST 30 EVENTS ===')
for (const e of events) {
  const payload = JSON.stringify(e.payload)?.slice(0, 150)
  console.log(`[${e.id}] ${e.eventType} | agent=${e.agentName} | payload=${payload}`)
}

const outputs = await db.select().from(agentOutputs)
  .where(eq(agentOutputs.sessionId, SESSION_ID))

console.log('\n=== AGENT OUTPUTS ===')
for (const o of outputs) {
  const out = JSON.stringify(o.output)?.slice(0, 200)
  console.log(`${o.agentName}: ${out}`)
}

await client.end()
