# Startup Swarm — Pi Agent Integration Guide

## What Pi Is (and Why We Use It)

[Pi-mono](https://github.com/badlogic/pi-mono) is a monorepo of LLM tooling packages by Mario Zechner. Three packages matter for Startup Swarm:

| Package | Role in Startup Swarm |
|---|---|
| `@mariozechner/pi-ai` | Unified LLM layer — one API for OpenAI, Anthropic, OpenRouter (and 20+ more providers) |
| `@mariozechner/pi-agent-core` | Stateful agent class — wraps pi-ai with message history, tool execution, event streaming, steering |
| `@mariozechner/pi-coding-agent` | Full coding agent — adds `read`/`write`/`bash` tools; the upgrade path for v2 |

All three run **inside the Daytona sandbox**, not on Vercel. Vercel is stateless and just orchestrates; the real intelligence lives in the sandbox.

---

## Package Relationship

```
@mariozechner/pi-coding-agent      ← full coding agent CLI + SDK (optional, v2 upgrade)
        │ uses
@mariozechner/pi-agent-core        ← Agent class with tool loop + event streaming
        │ uses
@mariozechner/pi-ai                ← unified stream/complete API for all LLM providers
```

For Startup Swarm v1:
- Install `@mariozechner/pi-ai` + `@mariozechner/pi-agent-core` inside sandbox (once, shared)
- Each of the 6 swarm agents is a **separate Node.js process** — a standalone script that creates its own `Agent` instance in its own memory
- Providers (OpenAI / Anthropic / OpenRouter) configured once in the orchestrator, inherited by all child processes

---

## Provider Support in pi-ai

`@mariozechner/pi-ai`'s `getModel(provider, modelId)` natively supports all three user-selectable providers:

| User Selects | pi-ai provider string | Env var pi-ai reads automatically |
|---|---|---|
| OpenAI | `'openai'` | `OPENAI_API_KEY` |
| Anthropic | `'anthropic'` | `ANTHROPIC_API_KEY` |
| OpenRouter | `'openrouter'` | `OPENROUTER_API_KEY` |

The orchestrator maps the single `LLM_API_KEY` env var to whichever of these pi-ai expects:

```typescript
// orchestrator/index.ts — runs once before any agent starts
const provider = process.env.LLM_PROVIDER!
const apiKey   = process.env.LLM_API_KEY!

if (provider === 'openai')     process.env.OPENAI_API_KEY     = apiKey
if (provider === 'anthropic')  process.env.ANTHROPIC_API_KEY  = apiKey
if (provider === 'openrouter') process.env.OPENROUTER_API_KEY = apiKey
```

After that single setup, every `getModel()` call anywhere in the orchestrator just works — no credentials passed around in function arguments.

---

## The Agent Class (pi-agent-core)

From the [pi-agent-core README](https://github.com/badlogic/pi-mono/tree/main/packages/agent):

```typescript
import { Agent } from "@mariozechner/pi-agent-core"
import { getModel } from "@mariozechner/pi-ai"

const agent = new Agent({
  initialState: {
    systemPrompt: "You are a helpful assistant.",
    model: getModel("anthropic", "claude-3-5-sonnet-20241022"),
  }
})

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta)
  }
})

await agent.prompt("Hello!")
```

**Key things about Agent:**
- `agent.subscribe(handler)` — fires for every event (started, token delta, tool call, done)
- `await agent.prompt(text)` — sends a message, runs the full agent loop (including any tool calls), resolves when done
- `agent.state.messages` — full message history after completion
- `agent.abort()` — cancel mid-run
- `agent.setSystemPrompt()`, `agent.setModel()`, `agent.setTools()` — mutate state between prompts
- Multiple `Agent` instances are completely independent — safe to run in parallel

---

## Event Types We Care About

From the pi-agent-core event reference, the events we subscribe to in each Startup Swarm agent:

| Pi event | When it fires | What we do |
|---|---|---|
| `agent_start` | Agent begins processing | emit `agent_started` to webhook |
| `message_update` + `text_delta` | Each token chunk arrives | emit `agent_token` with `chunk` to webhook |
| `agent_end` | Agent fully done, all messages complete | emit `agent_done` with structured output to webhook |
| `tool_execution_start` | Agent starts a tool call | emit `agent_progress` message to webhook (v2) |
| `tool_execution_end` | Tool call completes | emit `agent_progress` message (v2) |

In v1 (text output only), we only need `message_update → text_delta` and `agent_end`.

---

## How Each Startup Swarm Agent Maps to a Process

Every Startup Swarm "role" (PM, Backend, Frontend, etc.) is a **separate Node.js process** — a standalone script that runs independently, creates its own `Agent` instance in its own memory, and exits when done. Processes share nothing in memory. Context flows only through `/workspace/state/` files on the sandbox filesystem.

```
ProductManager Agent
  systemPrompt:  "You are the Product Manager. Produce a PRD as JSON..."
  prompt input:  idea + (no prior state needed)
  saves to:      /workspace/state/productManager.json

BackendEngineer Agent
  systemPrompt:  "You are the Backend Engineer. Given this PRD, design the DB schema and API..."
  prompt input:  idea + productManager.json content
  saves to:      /workspace/state/backendEngineer.json

MarketingGrowth Agent
  systemPrompt:  "You are the Marketing & Growth lead. Given this PRD, create a GTM plan..."
  prompt input:  idea + productManager.json content
  saves to:      /workspace/state/marketingGrowth.json

ContentPitch Agent
  systemPrompt:  "You are the Content & Pitch writer. Create a pitch deck outline and reels script..."
  prompt input:  idea + productManager.json + marketingGrowth.json (if available)
  saves to:      /workspace/state/contentPitch.json

FrontendEngineer Agent
  systemPrompt:  "You are the Frontend Engineer. Given the PRD and API contracts, design the UI..."
  prompt input:  idea + productManager.json + backendEngineer.json + marketingGrowth.json (brand tone)
  saves to:      /workspace/state/frontendEngineer.json

CeoOrchestrator Agent (Phase 0 init + Phase 4 final)
  systemPrompt:  "You are the CEO. Synthesize all team outputs into an executive summary..."
  prompt input:  idea (Phase 0) / all state files (Phase 4)
  saves to:      /workspace/state/ceoSummary.json
```

---

## Full Agent File Template

Each agent is a **standalone script** — top-level async code, no exported functions. Run as `node /workspace/agents/backendEngineer.js`. Copy this template for all 6 agents:

```typescript
// orchestrator/agents/backendEngineer.ts
// Spawned as its own process by the orchestrator. Inherits all env vars.

import { Agent }    from "@mariozechner/pi-agent-core"
import { getModel } from "@mariozechner/pi-ai"
import { emit }     from "../shared/webhook"
import { readState, writeState } from "../shared/state"

const AGENT_NAME  = "backendEngineer"
const AGENT_PHASE = Number(process.env.AGENT_PHASE)   // passed by orchestrator on spawn

const SYSTEM_PROMPT = `
You are the Backend Engineer for a startup. You will receive a PRD and startup idea.
Design the technical backend:

- Database schema (tables, fields, relationships)
- API routes (method, path, request/response shape)
- Data models and types
- Authentication strategy
- Technology stack recommendation

Output ONLY valid JSON:
{ "dbSchema": "...", "apiRoutes": [...], "dataModels": "...", "techStack": "...", "authStrategy": "..." }
`.trim()

// First thing: tell the UI this agent process has started
await emit({ eventType: 'agent_started', agentName: AGENT_NAME, phase: AGENT_PHASE })

// Load context from prior agents via sandbox filesystem
const idea    = process.env.IDEA!
const prdData = await readState("productManager")   // written by productManager process

const model = getModel(process.env.LLM_PROVIDER as any, process.env.LLM_MODEL!)
const agent = new Agent({ initialState: { systemPrompt: SYSTEM_PROMPT, model } })

// Stream each token to webhook → DB → SSE → browser card
agent.subscribe(async (event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    await emit({ eventType: "agent_token", agentName: AGENT_NAME, chunk: event.assistantMessageEvent.delta })
  }
})

await agent.prompt(`Startup idea: ${idea}\n\nPRD:\n${JSON.stringify(prdData, null, 2)}\n\nDesign the backend as JSON.`)

// Extract output from final assistant message
const lastMsg = agent.state.messages.findLast(m => m.role === 'assistant')
const text    = typeof lastMsg?.content === 'string'
  ? lastMsg.content
  : (lastMsg?.content as any[])?.filter(b => b.type === 'text').map(b => b.text).join('') ?? ''
const output  = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')

// Save to sandbox filesystem so frontendEngineer can read it
await writeState(AGENT_NAME, output)

// Signal completion — webhook saves output to agent_outputs table, UI card goes green
await emit({ eventType: 'agent_done', agentName: AGENT_NAME, phase: AGENT_PHASE, payload: { output } })

process.exit(0)   // orchestrator's child_process.spawn Promise resolves here
```

---

## Parallel Execution — How Three Agents Run Simultaneously

In Phase 2, the orchestrator spawns three child processes at the same time:

```typescript
// orchestrator/index.ts — Phase 2
await Promise.all([
  spawnAgent('backendEngineer',  2),   // child process 1 — own PID, own memory
  spawnAgent('marketingGrowth',  2),   // child process 2 — own PID, own memory
  spawnAgent('contentPitch',     2),   // child process 3 — own PID, own memory
])
```

What happens:
1. Three separate Node.js processes start near-simultaneously — each is its own OS process with its own PID
2. Each process creates its own `Agent` instance and calls `agent.prompt(...)` — three independent LLM streams in flight at the same time
3. Each process's `subscribe()` fires `text_delta` events → three concurrent streams of `fetch()` calls to the webhook endpoint
4. Webhook inserts rows from all three agents into `agent_events` — the DB sees interleaved rows
5. SSE polls DB every 500ms, picks up rows from all three agents, sends to browser
6. Browser updates three cards simultaneously — three pulsing animations at once
7. Each process exits with `process.exit(0)` independently when done — `Promise.all()` resolves when the last one exits

If one process crashes, the others keep running. The orchestrator catches the non-zero exit code and can emit an `agent_error` event for that one card while the rest continue.

---

## Prompt Engineering for Structured Output

Each agent is instructed to output **only valid JSON**. This makes parsing deterministic. The system prompt always ends with the exact JSON schema expected.

Tips that work well with pi-ai agents:
1. Put the JSON schema at the **end** of the system prompt (models attend to it more)
2. Start the user prompt with the structured input data, end with the instruction
3. If the model adds prose before/after the JSON, use `extractJSON()` to find it
4. For complex outputs, break into two prompts: first a "think" prompt, then a "format as JSON" follow-up using `agent.prompt()` again (the Agent retains history)

```typescript
// Two-step prompting for better JSON reliability
await agent.prompt(`Analyze this startup idea and think through the backend needs:\n${idea}`)
await agent.prompt(`Now format your analysis as JSON matching this schema: ${schema}`)
// agent.state.messages now has both turns; second response should be clean JSON
```

---

## State File Hand-off (`orchestrator/shared/state.ts`)

The sandbox filesystem at `/workspace/state/` is how agents share context:

```typescript
import * as fs from 'fs/promises'
import * as path from 'path'

const STATE_DIR = '/workspace/state'

export async function writeState(agentName: string, data: object): Promise<void> {
  await fs.mkdir(STATE_DIR, { recursive: true })
  await fs.writeFile(
    path.join(STATE_DIR, `${agentName}.json`),
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

export async function readState(agentName: string): Promise<object | null> {
  try {
    const raw = await fs.readFile(path.join(STATE_DIR, `${agentName}.json`), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null  // Agent hasn't run yet (dependency not met)
  }
}

export async function readAllState(): Promise<Record<string, object>> {
  const result: Record<string, object> = {}
  try {
    const files = await fs.readdir(STATE_DIR)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const name = file.replace('.json', '')
      const raw  = await fs.readFile(path.join(STATE_DIR, file), 'utf-8')
      result[name] = JSON.parse(raw)
    }
  } catch {}
  return result
}
```

---

## Upgrade Path: pi-coding-agent (v2)

Once the basic text-output swarm is working, agents can be upgraded to `@mariozechner/pi-coding-agent` to give them actual file system tools. This means the Backend Engineer doesn't just _describe_ an API — it _writes_ the code.

```typescript
// v2 Backend Engineer using pi-coding-agent SDK
import { createAgentSession, SessionManager, AuthStorage, ModelRegistry } from "@mariozechner/pi-coding-agent"
import { getModel } from "@mariozechner/pi-ai"

const authStorage = AuthStorage.create()
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry: new ModelRegistry(authStorage),
})

// session now has read/write/bash/edit tools built in
// The agent can write files directly to /workspace/output/backend/
await session.prompt(`
  Write a complete Express.js API based on this PRD: ${JSON.stringify(prdData)}
  Save all files to /workspace/output/backend/
  Include: schema.ts, routes/index.ts, middleware/auth.ts
`)
```

With pi-coding-agent, the swarm outputs **working code**, not just documentation. The zip download becomes a deployable starter project.

---

## Env Vars Inside the Sandbox

```
# Injected by /api/spawn via sandbox.process.exec env arg
IDEA=
SESSION_ID=
SELECTED_AGENTS=               ← comma-separated agent names
LLM_PROVIDER=                  ← 'openai' | 'anthropic' | 'openrouter'
LLM_MODEL=                     ← e.g. 'gpt-4o' or 'claude-3-5-sonnet-20241022'
LLM_API_KEY=                   ← user's key, ephemeral
WEBHOOK_URL=                   ← https://yourapp.vercel.app/api/webhook/<sessionId>
WEBHOOK_SECRET=                ← random hex, validated on each webhook POST
ITERATION_FEEDBACK=            ← only set on /api/iterate calls (sandbox reused, not recreated)
AGENT_PHASE=                   ← phase number passed by orchestrator when spawning each agent

# Set by orchestrator/index.ts from LLM_PROVIDER + LLM_API_KEY
OPENAI_API_KEY=                ← set if LLM_PROVIDER=openai
ANTHROPIC_API_KEY=             ← set if LLM_PROVIDER=anthropic
OPENROUTER_API_KEY=            ← set if LLM_PROVIDER=openrouter
```

Pi-ai reads the provider-specific key automatically. The user's raw API key is only ever visible inside the sandbox process — never in any log, database, or Next.js function.

---

## Packages to Install Inside Sandbox

```json
{
  "dependencies": {
    "@mariozechner/pi-ai": "latest",
    "@mariozechner/pi-agent-core": "latest"
  }
}
```

Run `npm install` via `sandbox.process.exec('npm install', ...)` as part of the `/api/spawn` flow, before starting the orchestrator. Both packages are small and fast to install.

For v2 (coding agents): add `"@mariozechner/pi-coding-agent": "latest"`.
