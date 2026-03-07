# Startup Swarm — Implementation Guide

## Overview

One user session = one Daytona sandbox. All Pi-mono agents live inside that sandbox. The orchestrator runs a **DAG execution model** — parallel where dependencies allow. Next.js talks to Daytona via the TypeScript SDK.

**No global variables, no in-memory state.** Everything is persisted in Postgres via Drizzle ORM. The event flow is:

1. Orchestrator (inside Daytona) → **POSTs events** to `/api/webhook/[sessionId]`
2. Webhook handler → **INSERTs** events into `agent_events` table in Postgres
3. Browser SSE (`/api/stream/[sessionId]`) → **polls** `agent_events` table every 500ms → streams new rows

This is fully stateless on the Next.js side. Every function invocation reads from and writes to Postgres. No shared memory, no global variables, no `Map`, no `EventEmitter`.

---

## Step 1 — Project Structure

```
startup-swarm/
├── app/
│   ├── page.tsx                           ← landing: idea input, provider/model selector, agent toggles
│   ├── dashboard/[sessionId]/
│   │   └── page.tsx                       ← live DAG agent grid
│   └── api/
│       ├── spawn/route.ts                 ← write session to DB, create Daytona sandbox, start orchestrator
│       ├── webhook/[sessionId]/route.ts   ← receives events from orchestrator, writes to DB
│       ├── stream/[sessionId]/route.ts    ← SSE endpoint, polls DB for new events
│       └── iterate/route.ts               ← re-run single agent with feedback
├── db/
│   ├── schema.ts                          ← Drizzle table definitions
│   ├── index.ts                           ← Drizzle client singleton (Neon serverless)
│   └── migrations/                        ← auto-generated SQL migrations
├── lib/
│   ├── daytona.ts                         ← Daytona SDK singleton
│   └── llmProviders.ts                    ← provider/model config + validation
├── components/
│   ├── AgentCard.tsx                      ← single agent card with status, stream, improve
│   ├── AgentGrid.tsx                      ← DAG layout grid
│   ├── ProviderSelector.tsx               ← OpenAI / Anthropic / OpenRouter picker
│   └── TokenStream.tsx                    ← live scrolling token output
└── orchestrator/
    ├── index.ts                           ← DAG process manager (runs INSIDE Daytona sandbox)
    ├── agents/
    │   ├── productManager.ts              ← standalone script — run as its own process
    │   ├── backendEngineer.ts             ← standalone script
    │   ├── frontendEngineer.ts            ← standalone script
    │   ├── marketingGrowth.ts             ← standalone script
    │   ├── contentPitch.ts                ← standalone script
    │   └── ceoOrchestrator.ts             ← standalone script (used in Phase 0 and Phase 4)
    └── shared/
        ├── state.ts                       ← read/write JSON hand-off files (sandbox filesystem)
        └── webhook.ts                     ← POST events to Next.js webhook endpoint
```

---

## Step 2 — Pi-ai + Pi-agent-core Setup

Install inside the sandbox (once, shared by all agent processes):
```bash
npm install @mariozechner/pi-ai @mariozechner/pi-agent-core
```

**Provider mapping** — done once in `orchestrator/index.ts`, then inherited by all child processes:

```typescript
// Map our single LLM_API_KEY to whichever env var pi-ai reads automatically
const provider = process.env.LLM_PROVIDER!  // 'openai' | 'anthropic' | 'openrouter'
const apiKey   = process.env.LLM_API_KEY!

if (provider === 'openai')      process.env.OPENAI_API_KEY      = apiKey
if (provider === 'anthropic')   process.env.ANTHROPIC_API_KEY   = apiKey
if (provider === 'openrouter')  process.env.OPENROUTER_API_KEY  = apiKey
```

When the orchestrator spawns agent processes via `child_process.spawn(..., { env: process.env })`, all env vars — including the provider-specific key just set — are inherited automatically. Every agent process calls `getModel(provider, modelId)` and pi-ai picks up the key from its own env. No credentials need to be passed as arguments.

**API key security**: The key is passed from Next.js to the sandbox via Daytona's exec env arg. It is never written to the database, never appears in Next.js logs, and is destroyed when the sandbox is cleaned up.

---

## Step 3 — Provider Config (`lib/llmProviders.ts` — Next.js side)

Defines what the UI shows. Maps directly to pi-ai's provider + model IDs:

```typescript
// Provider IDs here MUST match what @mariozechner/pi-ai's getModel() accepts
export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'o3-mini'],
  },
  anthropic: {
    label: 'Anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-4o',
    models: [],  // free-text — user types any OpenRouter model slug
  },
}
export const DEFAULT_PROVIDER = 'openai'
```

These provider IDs (`'openai'`, `'anthropic'`, `'openrouter'`) are the exact strings `getModel()` in pi-ai expects — no mapping layer needed.

---

## Step 4 — Webhook Helper (`orchestrator/shared/webhook.ts`)

Every event the orchestrator wants to emit goes through this helper instead of `console.log`:

```typescript
// Runs inside Daytona sandbox — makes HTTP calls to the Next.js app

const WEBHOOK_URL    = process.env.WEBHOOK_URL!
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!

export async function emit(event: {
  eventType: string
  agentName?: string
  phase?: number
  chunk?: string
  message?: string
  payload?: object
}) {
  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: WEBHOOK_SECRET, ...event }),
  })
}
```

Called like: `await emit({ eventType: 'agent_started', agentName: 'productManager', phase: 1 })`

The orchestrator still `console.log`s for local debugging, but the webhook is the source of truth for the browser.

---

## Step 5 — Database Schema (`db/schema.ts`)

Three tables. No in-memory state anywhere.

```typescript
import { pgTable, text, serial, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'

// One row per user session
export const sessions = pgTable('sessions', {
  id:             text('id').primaryKey(),             // UUID generated client-side
  sandboxId:      text('sandbox_id'),                  // Daytona sandbox ID (set after creation)
  userId:         text('user_id').notNull(),            // from NextAuth session
  status:         text('status').notNull().default('spawning'),
                                                       // 'spawning' | 'running' | 'complete' | 'error'
  idea:           text('idea').notNull(),
  selectedAgents: jsonb('selected_agents').notNull(),  // string[]
  llmProvider:    text('llm_provider').notNull(),
  llmModel:       text('llm_model').notNull(),
  downloadUrl:    text('download_url'),                // set on swarm_complete
  webhookSecret:  text('webhook_secret').notNull(),    // random token, validated on each webhook call
  createdAt:      timestamp('created_at').defaultNow(),
  expiresAt:      timestamp('expires_at').notNull(),   // createdAt + 45min; extended on each /api/iterate call
})

// Append-only event log — this IS the message bus (replaces sseEmitter)
export const agentEvents = pgTable('agent_events', {
  id:          serial('id').primaryKey(),              // auto-increment, used as SSE cursor
  sessionId:   text('session_id').notNull().references(() => sessions.id),
  eventType:   text('event_type').notNull(),           // 'agent_started' | 'agent_token' | 'agent_done' | ...
  agentName:   text('agent_name'),
  phase:       integer('phase'),
  chunk:       text('chunk'),                          // token text for agent_token events
  message:     text('message'),                        // human-readable progress description
  payload:     jsonb('payload'),                       // arbitrary structured data
  createdAt:   timestamp('created_at').defaultNow(),
})

// Final structured output per agent (written once, readable by dashboard + iterate)
export const agentOutputs = pgTable('agent_outputs', {
  id:          serial('id').primaryKey(),
  sessionId:   text('session_id').notNull().references(() => sessions.id),
  agentName:   text('agent_name').notNull(),
  output:      jsonb('output').notNull(),
  createdAt:   timestamp('created_at').defaultNow(),
})
```

**`db/index.ts`** — Drizzle client using Neon serverless (HTTP-based, compatible with Vercel):

```typescript
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

Use **Neon** (serverless Postgres). It uses HTTP connections instead of persistent TCP sockets — this is critical for Vercel serverless functions which can't hold long-lived connections.

---

## Step 6 — The `/api/spawn` Route

Receives from browser:
```json
{
  "idea": "An app that...",
  "sessionId": "uuid",
  "selectedAgents": ["productManager", "backendEngineer", "marketingGrowth", "contentPitch", "frontendEngineer", "ceoOrchestrator"],
  "llmProvider": "openai",
  "llmModel": "gpt-4o",
  "apiKey": "sk-..."
}
```

Steps:
1. Generate `webhookSecret` — `crypto.randomBytes(32).toString('hex')`
2. **INSERT** into `sessions`: `{ id, userId, idea, selectedAgents, llmProvider, llmModel, webhookSecret, status: 'spawning', expiresAt: now+45min }`
3. `daytona.create()` → sandbox in <90ms
4. **UPDATE** `sessions SET sandbox_id = ?, status = 'running' WHERE id = ?`
5. Upload entire `orchestrator/` folder to `/workspace/` inside sandbox
6. Run `npm install` inside sandbox (`openai`, `@anthropic-ai/sdk`)
7. `sandbox.process.exec('node /workspace/orchestrator/index.js', { env: { IDEA, SESSION_ID, SELECTED_AGENTS, LLM_PROVIDER, LLM_MODEL, LLM_API_KEY: apiKey, WEBHOOK_URL: appBaseUrl + '/api/webhook/' + sessionId, WEBHOOK_SECRET: webhookSecret } })`
8. Return `{ sessionId }` — browser navigates to `/dashboard/[sessionId]`

`apiKey` is **never written to the DB** — it goes directly to the sandbox env and is destroyed with the sandbox.

---

## Step 7 — The `/api/webhook/[sessionId]` Route

The orchestrator POSTs every event here. This is the only way events enter the system.

```typescript
export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  const body = await req.json()

  // Validate webhook secret against DB
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, params.sessionId)
  })
  if (!session || body.secret !== session.webhookSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (new Date() > session.expiresAt) {
    return Response.json({ error: 'Session expired' }, { status: 410 })
  }

  // Insert the event — this is what the SSE endpoint will pick up
  await db.insert(agentEvents).values({
    sessionId: params.sessionId,
    eventType: body.eventType,
    agentName: body.agentName ?? null,
    phase:     body.phase    ?? null,
    chunk:     body.chunk    ?? null,
    message:   body.message  ?? null,
    payload:   body.payload  ?? null,
  })

  // On agent completion: persist the structured output
  if (body.eventType === 'agent_done' && body.payload?.output) {
    await db.insert(agentOutputs).values({
      sessionId: params.sessionId,
      agentName: body.agentName,
      output:    body.payload.output,
    })
  }

  // On swarm completion: zip outputs, upload to Vercel Blob, update session
  if (body.eventType === 'swarm_complete') {
    const downloadUrl = await zipAndUpload(params.sessionId, session.sandboxId!)
    await db.update(sessions)
      .set({ status: 'complete', downloadUrl })
      .where(eq(sessions.id, params.sessionId))
    // Insert a final event with the download URL so SSE picks it up
    await db.insert(agentEvents).values({
      sessionId: params.sessionId,
      eventType: 'download_ready',
      payload:   { downloadUrl },
    })
  }

  return Response.json({ ok: true })
}
```

Completely stateless — reads/writes Postgres only. Each invocation is independent.

---

## Step 8 — Orchestrator as Process Manager (`orchestrator/index.ts`)

The orchestrator is a single Node.js process that acts as a **DAG process manager**. It spawns each agent as a separate child process using Node.js built-in `child_process.spawn()`, waits for them to exit, and sequences phases accordingly.

```typescript
import { spawn }  from 'child_process'
import { emit }   from './shared/webhook'

// Map LLM_API_KEY to the provider-specific env var pi-ai reads
const provider = process.env.LLM_PROVIDER!
const apiKey   = process.env.LLM_API_KEY!
if (provider === 'openai')     process.env.OPENAI_API_KEY     = apiKey
if (provider === 'anthropic')  process.env.ANTHROPIC_API_KEY  = apiKey
if (provider === 'openrouter') process.env.OPENROUTER_API_KEY = apiKey

const selectedAgents = process.env.SELECTED_AGENTS!.split(',')
const has = (name: string) => selectedAgents.includes(name)

// Spawns one agent script as a child process and waits for it to exit cleanly
function spawnAgent(scriptName: string, phase: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [`/workspace/agents/${scriptName}.js`], {
      env: { ...process.env, AGENT_PHASE: String(phase) },
      stdio: 'inherit',  // agent stdout/stderr appears in orchestrator terminal
    })
    proc.on('exit', code => code === 0 ? resolve() : reject(new Error(`${scriptName} exited ${code}`)))
    proc.on('error', reject)
  })
}

// Phase 0
await emit({ eventType: 'phase_started', phase: 0 })
await spawnAgent('ceoOrchestrator', 0)
await emit({ eventType: 'phase_done', phase: 0 })

// Phase 1
await emit({ eventType: 'phase_started', phase: 1 })
if (has('productManager')) await spawnAgent('productManager', 1)
await emit({ eventType: 'phase_done', phase: 1 })

// Phase 2 — three processes spawned simultaneously, all run in parallel
await emit({ eventType: 'phase_started', phase: 2 })
await Promise.all([
  has('backendEngineer') ? spawnAgent('backendEngineer', 2) : Promise.resolve(),
  has('marketingGrowth') ? spawnAgent('marketingGrowth', 2) : Promise.resolve(),
  has('contentPitch')    ? spawnAgent('contentPitch',    2) : Promise.resolve(),
])
await emit({ eventType: 'phase_done', phase: 2 })

// Phase 3
await emit({ eventType: 'phase_started', phase: 3 })
if (has('frontendEngineer')) await spawnAgent('frontendEngineer', 3)
await emit({ eventType: 'phase_done', phase: 3 })

// Phase 4
await emit({ eventType: 'phase_started', phase: 4 })
await spawnAgent('ceoOrchestrator', 4)
await emit({ eventType: 'phase_done', phase: 4 })

await emit({ eventType: 'swarm_complete' })
```

**Key points:**
- `{ env: process.env }` passes ALL env vars (including the provider key just set) to every child process — no credentials need to be threaded through function arguments
- `stdio: 'inherit'` means all agent output is visible in the orchestrator terminal for debugging
- Each child process runs completely independently in its own memory space
- The orchestrator only emits `phase_started` / `phase_done` / `swarm_complete` — each agent process emits its own `agent_started`, `agent_token`, and `agent_done` events via the webhook

---

## Step 9 — Individual Agent as Standalone Script (`orchestrator/agents/productManager.ts`)

Agent files are **standalone executable scripts** — not modules that export functions. They run top-level async code and call `process.exit(0)` when done.

```typescript
// orchestrator/agents/productManager.ts
// Runs as: node /workspace/agents/productManager.js
// Inherits all env vars from orchestrator

import { Agent }    from "@mariozechner/pi-agent-core"
import { getModel } from "@mariozechner/pi-ai"
import { emit }     from "../shared/webhook"
import { readState, writeState } from "../shared/state"

const AGENT_NAME = "productManager"
const AGENT_PHASE = Number(process.env.AGENT_PHASE)

const SYSTEM_PROMPT = `
You are the Product Manager for a startup. Given the startup idea, produce:
- A full PRD (Problem, Solution, Core Features, User Stories)
- A 3-phase roadmap
- Target audience definition
- Core technical requirements

Output ONLY valid JSON: { prd, userStories, roadmap, targetAudience, techRequirements, coreFeatures }
`.trim()

// Announce this process is starting — UI card flips to "Working"
await emit({ eventType: 'agent_started', agentName: AGENT_NAME, phase: AGENT_PHASE })

const model = getModel(process.env.LLM_PROVIDER as any, process.env.LLM_MODEL!)
const idea  = process.env.IDEA!

const agent = new Agent({ initialState: { systemPrompt: SYSTEM_PROMPT, model } })

// Each token → webhook → DB → SSE → browser card stream
agent.subscribe(async (event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    await emit({ eventType: "agent_token", agentName: AGENT_NAME, chunk: event.assistantMessageEvent.delta })
  }
})

await agent.prompt(`Startup idea: ${idea}\n\nProduce the PRD and roadmap as JSON.`)

// Extract structured output from final assistant message
const lastMsg      = agent.state.messages.findLast(m => m.role === 'assistant')
const responseText = typeof lastMsg?.content === 'string'
  ? lastMsg.content
  : (lastMsg?.content as any[])?.filter(b => b.type === 'text').map(b => b.text).join('') ?? ''
const output = JSON.parse(responseText.match(/\{[\s\S]*\}/)?.[0] ?? '{}')

// Save to sandbox filesystem — downstream agents read this file
await writeState(AGENT_NAME, output)

// Announce completion with the structured output — webhook saves it to agent_outputs table
await emit({ eventType: 'agent_done', agentName: AGENT_NAME, phase: AGENT_PHASE, payload: { output } })

process.exit(0)
```

**The template is identical for all 6 agent scripts** — change `AGENT_NAME`, `SYSTEM_PROMPT`, and which `readState()` calls appear before the prompt. Everything else is boilerplate.

---

## Step 10 — SSE Stream (`/api/stream/[sessionId]`)

No `EventEmitter`. No shared memory. Just polls Postgres:

```typescript
export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  const encoder = new TextEncoder()
  let lastSeenId = 0

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // On first connect: replay all existing events so the dashboard loads correctly after a refresh
      const existing = await db.select().from(agentEvents)
        .where(eq(agentEvents.sessionId, params.sessionId))
        .orderBy(agentEvents.id)
      for (const row of existing) {
        send(row)
        lastSeenId = row.id
      }

      // Then poll for new events every 500ms
      const interval = setInterval(async () => {
        const newRows = await db.select().from(agentEvents)
          .where(and(
            eq(agentEvents.sessionId, params.sessionId),
            gt(agentEvents.id, lastSeenId)
          ))
          .orderBy(agentEvents.id)

        for (const row of newRows) {
          send(row)
          lastSeenId = row.id
          if (row.eventType === 'download_ready' || row.eventType === 'swarm_complete') {
            clearInterval(interval)
            controller.close()
            return
          }
        }
      }, 500)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
```

**Key benefit of DB polling:** If the user closes the tab and reopens it, the SSE route replays all existing events from Postgres — the dashboard rebuilds its state perfectly. No data is ever lost because the server restarted.

Browser-side: `new EventSource('/api/stream/sessionId')` → update React state per event.

---

## Step 11 — Agent Cards UI (`components/AgentCard.tsx`)

Each card shows:
- **Header**: agent icon + name + color-coded badge
- **Status**: `Idle` / `Waiting for [dependency]...` / `Working` (pulsing dot) / `Done ✓` / `Error`
- **Phase tag**: which DAG phase this agent runs in
- **Live token stream**: scrolling `<TokenStream>` — appends `agent_token` chunks character by character
- **Output preview**: collapsed after done, expandable
- **Improve button**: visible after done — opens inline feedback textarea

Status color scheme:
- Idle: gray
- Waiting: amber (waiting on dependency)
- Working: blue with pulsing animation
- Done: green
- Error: red

---

## Step 12 — Agent Grid Layout (`components/AgentGrid.tsx`)

```
Row 1 (Phase 1):  [Product Manager]

Row 2 (Phase 2):  [Backend Engineer]  [Marketing & Growth]  [Content + Pitch]
                       ↑ parallel ↑        ↑ parallel ↑       ↑ parallel ↑

Row 3 (Phase 3):  [Frontend Engineer]

Row 4 (Phase 4):  [CEO Orchestrator]
```

- Dependency arrows rendered as SVG lines between cards
- When Phase 2 starts, all three cards flip to blue simultaneously
- Cards in later phases show "Waiting for Backend Engineer..." until their dependency resolves

---

## Step 13 — Provider Selector UI (`components/ProviderSelector.tsx`)

```
┌─────────────────────────────────────────────────────┐
│  AI Provider                                        │
│  ● OpenAI (default)  ○ Anthropic  ○ OpenRouter      │
│                                                     │
│  Model: [gpt-4o ▼]                                  │
│                                                     │
│  API Key: [sk-...                              ]    │
│           🔒 Sent directly to sandbox, never stored │
└─────────────────────────────────────────────────────┘
```

- `localStorage` saves provider + model + key for convenience (stays local to browser)
- Warning shown if key is empty when "Launch Swarm" is clicked
- OpenRouter model field is free text (no dropdown)

---

## Step 14 — `/api/iterate` Route

Post-run agent improvement. The sandbox is **reused, not recreated** — all state files are still on the filesystem, `node_modules` is already installed, and the agent re-spawns in under a second.

```typescript
export async function POST(req: Request) {
  const { sessionId, agentName, feedback } = await req.json()

  // Load session — includes sandboxId and all original env vars
  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) })
  if (!session) return Response.json({ error: 'Not found' }, { status: 404 })

  // Extend the sandbox lifetime on every iteration — active users never lose their sandbox
  await db.update(sessions)
    .set({ expiresAt: new Date(Date.now() + 45 * 60 * 1000) })
    .where(eq(sessions.id, sessionId))

  // Check if sandbox is still alive
  let sandboxId = session.sandboxId
  if (!sandboxId || new Date() > session.expiresAt) {
    // Sandbox expired — create a fresh one and re-run the full swarm first
    // (rare path — only if user comes back after 45+ min of inactivity)
    return Response.json({ error: 'sandbox_expired', message: 'Session expired. Please start a new swarm.' }, { status: 410 })
    // (In v2: auto-recreate sandbox and replay all phases, then apply feedback)
  }

  const sandbox = await daytona.get(sandboxId)

  // Flip that card back to working state in the UI
  await db.insert(agentEvents).values({
    sessionId,
    eventType: 'agent_started',
    agentName,
    message: `Re-running ${agentName} with feedback...`,
  })

  // Re-spawn just that one agent process — all other state files untouched
  sandbox.process.exec(
    `node /workspace/agents/${agentName}.js`,
    {
      env: {
        IDEA:             session.idea,
        SESSION_ID:       sessionId,
        LLM_PROVIDER:     session.llmProvider,
        LLM_MODEL:        session.llmModel,
        LLM_API_KEY:      req.headers.get('x-api-key')!,  // browser re-sends key
        WEBHOOK_URL:      `${process.env.APP_BASE_URL}/api/webhook/${sessionId}`,
        WEBHOOK_SECRET:   session.webhookSecret,
        AGENT_PHASE:      getAgentPhase(agentName),
        ITERATION_FEEDBACK: feedback,
      }
    }
  )

  return Response.json({ ok: true })
}
```

**Key points:**
- `expiresAt` is extended by 45 minutes on every `/api/iterate` call — a user actively iterating never hits expiry
- The sandbox has all state files from the original run — `backendEngineer.json`, `productManager.json`, etc. — already on its filesystem; the re-spawned agent reads them naturally
- `LLM_API_KEY` is never stored in DB; the browser must re-send it in the request header (already in `localStorage`)
- If sandbox has expired (user came back after 45+ min idle), return a clear error — v1 asks them to start fresh; v2 can auto-recover

---

## Step 15 — Zip + Download

Triggered inside the `/api/webhook/[sessionId]` route when `eventType === 'swarm_complete'`:

1. Fetch `sandboxId` from the session row already loaded during webhook validation
2. Download each output file from `/workspace/state/` via `sandbox.fs.downloadFile()`
3. Zip in memory using `archiver`
4. Upload to Vercel Blob → get public URL
5. `UPDATE sessions SET download_url = ?, status = 'complete'`
6. Insert `download_ready` event → SSE picks it up → dashboard shows "Download your Startup Kit" button

All of this is triggered server-side by the webhook, not by the SSE handler. The SSE handler is read-only — it only polls the DB, never triggers side effects.

---

## Step 16 — Cleanup

Sandbox lifetime is **45 minutes from last activity** (extended on every `/api/iterate` call):
- On each webhook call: check `expiresAt` — if expired, return 410 and skip processing
- `/api/iterate` always extends `expiresAt` by 45 min before doing anything else — a user actively iterating never hits expiry mid-session
- Cleanup job (a Vercel cron route `GET /api/cron/cleanup`): `SELECT * FROM sessions WHERE expires_at < now() AND status != 'complete'` → for each, call `daytona.remove(sandboxId)` → `UPDATE sessions SET status = 'expired'`
- Sessions with `status = 'complete'` (user downloaded): sandbox deleted immediately after zip upload, no need to wait for cron
- Vercel Blob download link remains valid for 24 hours after upload

**Cost note:** Keeping a sandbox alive for the full 45-minute window costs at most ~$0.05 (5 cents). For active iterating users this is the right trade-off — instant re-spawns vs. a negligible idle compute charge.

---

## Env Variables

### Next.js (Vercel)
```
DATABASE_URL=             ← Neon Postgres connection string
DAYTONA_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
BLOB_READ_WRITE_TOKEN=    ← Vercel Blob
APP_BASE_URL=             ← e.g. https://startupswarm.app (for building WEBHOOK_URL)
```

### Orchestrator (injected via Daytona exec — never stored in DB)
```
IDEA=
SESSION_ID=
SELECTED_AGENTS=
LLM_PROVIDER=             ← openai | anthropic | openrouter
LLM_MODEL=                ← e.g. gpt-4o
LLM_API_KEY=              ← user's own key, ephemeral, destroyed with sandbox
WEBHOOK_URL=              ← https://startupswarm.app/api/webhook/[sessionId]
WEBHOOK_SECRET=           ← random 32-char hex, stored in sessions.webhook_secret
ITERATION_FEEDBACK=       ← only set during iterate calls
```

---

## Key Things to Keep in Mind

- **No global variables, no shared memory** — every Next.js function reads from Postgres, writes to Postgres, done
- **Neon serverless Postgres** — use `@neondatabase/serverless` with Drizzle; HTTP not TCP, works on Vercel serverless
- **Webhook is the only event source** — orchestrator POSTs to `/api/webhook`, which INSERTs to DB; SSE just reads DB
- **SSE is read-only** — polls `agent_events` only, no side effects; replays all events on reconnect so dashboard survives tab refresh
- **API key never stored** — mapped to provider env var at orchestrator startup, only lives inside the ephemeral Daytona sandbox process
- **`@mariozechner/pi-ai` handles all three providers natively** — `getModel('openai', ...)`, `getModel('anthropic', ...)`, `getModel('openrouter', ...)` all work with the same API; no custom LLM client needed
- **One process per agent** — each agent is a standalone Node.js script spawned as a child process; its own memory, its own `Agent` instance, its own crash boundary
- **Env vars inherited automatically** — `{ env: process.env }` in `child_process.spawn()` passes everything through; no credential threading needed
- **`@mariozechner/pi-agent-core` Agent class** — each agent script creates one `Agent` instance; subscribe to `message_update → text_delta` for token streaming; `agent.state.messages` has the full history
- **Agent scripts emit their own lifecycle events** — `agent_started`, `agent_token`, `agent_done` all come from the child process; orchestrator only emits phase-level events
- **Phase 2 is true OS-level parallelism** — `Promise.all()` over three `child_process.spawn()` handles; three separate Node.js processes calling the LLM simultaneously; three cards light up at once
- **webhookSecret per session** — random hex, stored in `sessions` table, validated on every webhook POST to prevent spoofed events
- **One sandbox per session, reused for iteration** — check DB for active session before spawning; on `/api/iterate`, always reuse the existing sandbox (state files still there, `npm install` done, agent restarts in <1s); only create a new sandbox if `expiresAt` has passed
- **`expiresAt` extended on each iterate call** — `UPDATE sessions SET expires_at = now() + 45min` before re-spawning; an actively iterating user never loses their sandbox mid-session
- **Future upgrade: pi-coding-agent** — swap `@mariozechner/pi-agent-core` for `@mariozechner/pi-coding-agent` and add `read`/`write`/`bash` tools so agents write actual runnable code, not just descriptions
