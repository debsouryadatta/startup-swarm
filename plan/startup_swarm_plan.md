# Startup Swarm — Product Plan

## One-Line Pitch
Type a startup idea → a swarm of AI agents (Product Manager, Backend, Frontend, Marketing, Content, CEO) work in parallel inside a Daytona sandbox → live UI shows each agent thinking and building in real time → download your complete startup kit.

---

## What Makes This Different

Most AI tools run one model sequentially. Startup Swarm runs a **coordinated team** — agents that know about each other, hand off context, and work in parallel where possible. You watch it unfold like a real team standup, live.

---

## LLM Provider Selection

Users choose their provider and model before launching the swarm. Three providers supported:

| Provider | Default Model | Other Options |
|---|---|---|
| **OpenAI** *(default)* | `gpt-4o` | `gpt-4o-mini`, `o1-mini`, `o3-mini` |
| **Anthropic** | `claude-3-5-sonnet-20241022` | `claude-3-haiku-20240307`, `claude-3-opus-20240229` |
| **OpenRouter** | `openai/gpt-4o` | Any model on OpenRouter (free-text input) |

- Provider + model selection lives on the landing page, above the idea input
- Default is **OpenAI / gpt-4o** — no extra config needed if user has an OpenAI key
- API key is entered once, stored in `localStorage` (never sent to server — passed directly to sandbox env)
- All agents in a session use the same provider + model (keeping it simple for v1)

---

## Agent Roster

Six agents, user-toggleable. CEO Orchestrator is always on.

| # | Agent | Role | Depends On |
|---|---|---|---|
| 1 | **Product Manager** | PRD, user stories, roadmap | *(starting point)* |
| 2 | **Backend Engineer** | DB schema, API routes, data models | Product Manager |
| 3 | **Frontend Engineer** | UI components, pages, design spec | Product Manager + Backend Engineer |
| 4 | **Marketing & Growth** | Go-to-market plan, social content, campaigns | Product Manager |
| 5 | **Content + Pitch Team** | Pitch deck outline, investor one-pager, reels script | Product Manager + Marketing |
| 6 | **CEO Orchestrator** | Runs throughout — synthesizes final summary, spots gaps | All agents |

---

## Execution Model — Parallel Where Possible

This is **not** a sequential pipeline. It's a **DAG (Directed Acyclic Graph)** execution model:

```
Phase 0 ─── CEO Orchestrator initializes, sets global context

Phase 1 ─── Product Manager runs alone (everyone depends on this)
                │
                ▼
Phase 2 ─── [Backend Engineer]   [Marketing & Growth]   [Content + Pitch]
             runs in parallel      runs in parallel        runs in parallel
                │
                ▼
Phase 3 ─── Frontend Engineer runs (needs Backend's API contracts)

Phase 4 ─── CEO Orchestrator finalizes — reads all outputs, writes summary
```

- Backend, Marketing, and Content agents **start simultaneously** the moment PM finishes
- Frontend waits only for Backend (not Marketing/Content)
- Each agent reads the outputs of its dependencies from the shared state store before running
- CEO Orchestrator watches all agents and synthesizes at the very end

---

## Live Agent Status UI

The dashboard is the core product experience. Each agent gets a **card** with:

- **Status badge**: `Idle` / `Waiting` / `Working...` (pulsing) / `Done` / `Error`
- **Live thought stream**: token-by-token output scrolling inside the card as the agent generates
- **Phase indicator**: which execution phase the agent is in
- **Dependency links**: subtle arrows showing which agents fed context into this one
- **Output preview**: collapsed summary of what the agent produced, expandable
- **Improve button**: post-run, click to re-run that one agent with feedback

Visual design:
- Cards arranged in a **timeline grid** that reflects the DAG phases (PM on top, parallel agents in the middle row, Frontend below, CEO at the bottom)
- Parallel agents animate simultaneously — you can literally watch three agents thinking at once
- Color-coded by agent type (blue = technical, green = business, purple = creative)
- A global progress bar shows overall swarm completion %

---

## Core Features

- **Multi-provider LLM** — OpenAI, Anthropic, or OpenRouter, user's own API key
- **Parallel execution** — agents run concurrently when their dependencies are met
- **Live status UI** — real-time card updates, token streaming, dependency visualization
- **Per-agent iteration** — re-run any single agent with feedback after the run
- **Zip download** — all outputs packaged, shareable link via Vercel Blob
- **Agent toggles** — enable/disable agents before launch (except CEO)

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend + API | Next.js 15 (App Router) |
| Database | Neon Postgres + Drizzle ORM |
| Sandbox | Daytona (`@daytonaio/sdk`) |
| LLM unified layer | `@mariozechner/pi-ai` — supports OpenAI, Anthropic, OpenRouter natively |
| Agent framework | `@mariozechner/pi-agent-core` — stateful Agent with tool execution + event streaming |
| LLM providers | OpenAI / Anthropic / OpenRouter (user-selected, all supported by pi-ai) |
| Agent execution | One process per agent via Node.js `child_process.spawn()` inside one Daytona sandbox |
| Parallel execution | `Promise.all()` over process handles — true OS-level parallelism in Phase 2 |
| Live updates | Server-Sent Events (SSE) polling Postgres |
| Event ingestion | Webhook endpoint (`/api/webhook/[sessionId]`) |
| Auth | NextAuth |
| File storage | Vercel Blob (final zips) |
| Deployment | Vercel |

**Why one sandbox, multiple terminal processes:**
- All agent processes share the same `/workspace/state/` filesystem — no cross-sandbox file transfer needed
- Each agent is an independent OS process: a crash in one doesn't affect the others
- Phase 2 parallelism is true OS-level concurrency — three processes making LLM calls simultaneously, not coroutines
- Each process has its own isolated memory, its own pi-agent-core `Agent` instance, its own log stream
- Iteration (`/api/iterate`) re-spawns exactly one agent process — all other agents' state files are untouched
- This is the same pattern used by OpenClaw and pi-coding-agent — multiple pi processes, one environment

**Why pi-ai + pi-agent-core:**
- `@mariozechner/pi-ai` provides a single `getModel(provider, modelId)` API that covers OpenAI, Anthropic, OpenRouter — no custom LLM client needed
- `@mariozechner/pi-agent-core` gives each agent process a stateful `Agent` instance with built-in token streaming (`message_update → text_delta`), tool execution loop, and message history
- All three user-selectable providers are native in pi-ai — just different strings for the same API
- Future upgrade path: swap to `@mariozechner/pi-coding-agent` per agent to give them file read/write/bash tools

**Why Drizzle + Neon Postgres instead of in-memory state:**
- Vercel serverless functions have no shared memory between invocations — a `Map` or `EventEmitter` is wiped on every cold start
- All session state (sandboxId, agent status, event log) lives in Postgres — survives restarts, scales across instances, and lets users reload the dashboard mid-run without losing any progress

---

## Architecture (Bird's Eye)

```
User (Browser)
   │
   ├─ Enters idea, selects provider + model + API key, toggles agents
   ├─ POST /api/spawn → { idea, selectedAgents, llmProvider, llmModel, apiKey }
   │
Next.js API (Vercel — stateless serverless functions)
   │
   ├─ /api/spawn
   │     ├─ INSERT session row into Postgres (status: 'spawning')
   │     ├─ daytona.create()                    ← isolated sandbox
   │     ├─ UPDATE session row with sandboxId
   │     ├─ upload orchestrator scripts to sandbox
   │     ├─ sandbox.process.exec(orchestrator, { env: { WEBHOOK_URL, ... } })
   │     └─ return { sessionId } to browser
   │
   ├─ /api/webhook/[sessionId]                  ← orchestrator POSTs every event here
   │     ├─ parse event payload
   │     ├─ INSERT row into agent_events table
   │     └─ on SWARM:COMPLETE → zip sandbox outputs → Vercel Blob → UPDATE session.downloadUrl
   │
   ├─ /api/stream/[sessionId]                   ← SSE, browser connects here
   │     ├─ poll agent_events WHERE id > lastSeenId every 500ms
   │     ├─ stream new rows as SSE events
   │     └─ close on swarm_complete event or timeout
   │
   └─ /api/iterate                              ← re-run single agent with feedback
         ├─ SELECT sandboxId FROM sessions WHERE id = ?
         └─ sandbox.process.exec(singleAgent, { env: { ITERATION_FEEDBACK } })

Postgres (source of truth — no global vars anywhere)
   ├─ sessions          ← one row per user session
   ├─ agent_events      ← append-only event log (the message bus)
   └─ agent_outputs     ← final structured output per agent

Single Daytona Sandbox (one per user session)
   ├─ /workspace/
   │     ├── node_modules/          ← installed once, shared by all processes
   │     ├── orchestrator/          ← uploaded by /api/spawn
   │     └── state/                 ← JSON hand-off files written by each agent process
   │
   ├─ Terminal 1: node orchestrator/index.js    ← DAG process manager
   │     ├─ Maps LLM_API_KEY → provider-specific env var for pi-ai
   │     ├─ Phase 0: child_process.spawn(ceoOrchestrator.js) → wait for exit
   │     ├─ Phase 1: child_process.spawn(productManager.js)  → wait for exit
   │     ├─ Phase 2: Promise.all([                            → wait for ALL to exit
   │     │             child_process.spawn(backendEngineer.js),
   │     │             child_process.spawn(marketingGrowth.js),
   │     │             child_process.spawn(contentPitch.js)
   │     │           ])
   │     ├─ Phase 3: child_process.spawn(frontendEngineer.js) → wait for exit
   │     └─ Phase 4: child_process.spawn(ceoOrchestrator.js --finalize) → swarm_complete
   │
   ├─ Terminal 2: node agents/productManager.js    ← own process, own memory, own Agent instance
   ├─ Terminal 3: node agents/backendEngineer.js   ← spawned simultaneously in Phase 2
   ├─ Terminal 4: node agents/marketingGrowth.js   ← spawned simultaneously in Phase 2
   └─ Terminal 5: node agents/contentPitch.js      ← spawned simultaneously in Phase 2

Each agent process:
   ├─ Inherits all env vars from orchestrator (IDEA, LLM_*, WEBHOOK_*, etc.)
   ├─ Creates its own Agent instance (pi-agent-core) in its own memory space
   ├─ Emits agent_started → token chunks → agent_done via webhook (its own HTTP calls)
   ├─ Reads /workspace/state/*.json for context (its dependencies' outputs)
   ├─ Writes /workspace/state/agentName.json on completion
   └─ Exits with code 0 on success (orchestrator detects this and moves to next phase)
```

---

## 2-Day Build Plan

### Prerequisites (30 min)
- Daytona account + API key
- OpenAI API key for testing
- Vercel project + NextAuth setup

---

### Day 1 — Core Engine (5–6 hrs)

1. **Next.js scaffold** — App Router, NextAuth, Tailwind, Drizzle ORM setup, Postgres connection
2. **DB schema** — `sessions`, `agent_events`, `agent_outputs` tables, run first migration
3. **Landing page** — idea input, provider/model selector, API key input, agent toggles, "Launch Swarm" button
4. **`/api/spawn` route** — write session to DB, create sandbox, start orchestrator with `WEBHOOK_URL`
5. **`/api/webhook/[sessionId]`** — receive events from orchestrator, insert into `agent_events`
6. **Orchestrator script** — DAG execution (Phase 0→1→2→3→4), POSTs events to webhook instead of just printing logs
7. **`/api/stream/[sessionId]`** — SSE that polls `agent_events` table, streams to browser
8. **Dashboard page** — agent cards in DAG layout, live status badges, token stream display

---

### Day 2 — Parallel UI + Iteration + Deploy (5–6 hrs)

1. **Parallel animation** — Phase 2 cards animate simultaneously, dependency arrows render
2. **Token streaming** — live text stream inside each card as agent generates
3. **`/api/iterate` route** — re-run single agent, inject feedback
4. **Iteration UI** — per-card Improve button + feedback textarea
5. **Zip + download** — collect outputs, zip, Vercel Blob
6. **Deploy** — `vercel deploy`, env vars, test full flow end-to-end
7. **3 demo runs** — record 30-sec Loom showing parallel agents + iteration

---

## Safety & Limits

- Each session = isolated Daytona sandbox (no cross-user leakage)
- Sandboxes kept alive for **45 minutes** from last activity (`expires_at` in DB, extended on each `/api/iterate` call so active users never lose their sandbox mid-iteration)
- If user iterates within the 45-min window → same sandbox reused instantly (state files still there, `npm install` already done, agent re-spawns in under a second)
- If sandbox has expired → create a fresh one, re-run the full swarm, then apply iteration feedback
- Rate limit: 1 active sandbox per user at a time (checked via DB query before spawn)
- API keys never stored in DB — passed directly to sandbox env at exec time, ephemeral
- Webhook endpoint validates a per-session secret (passed as `WEBHOOK_SECRET` env var to sandbox) to prevent spoofed events
- All outputs watermarked "Generated by Startup Swarm"
- Users can reload the dashboard mid-run — SSE reconnects and replays events from DB from where they left off
