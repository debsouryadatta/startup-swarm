# Startup Swarm — Agent Flow & UI Design

## The Core Idea

A real startup team doesn't work one person at a time. The PM writes the spec, and while the backend engineer starts on the database schema, the marketing person is already drafting the go-to-market plan. Startup Swarm mirrors this. The UI makes it *feel* like watching a real team — multiple agent cards pulsing at once, each thinking out loud in real time.

---

## Agent Dependency Graph

```
                    ┌─────────────────────┐
                    │   CEO Orchestrator  │  ← initializes context, finalizes at end
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Product Manager   │  ← PHASE 1 (everyone waits for this)
                    │   PRD + Roadmap     │
                    └─────────────────────┘
                    /          |           \
                   /           |            \
                  ▼            ▼             ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
      │   Backend    │  │  Marketing   │  │  Content + Pitch │  ← PHASE 2 (parallel)
      │   Engineer   │  │   & Growth   │  │      Team        │
      │  Schema+APIs │  │  GTM + Posts │  │ Pitch deck+reels │
      └──────────────┘  └──────────────┘  └──────────────────┘
            │                  │
            ▼                  │ (Content optionally reads Marketing output too)
      ┌──────────────┐         │
      │   Frontend   │◄────────┘ (optional: reads marketing for brand tone)
      │   Engineer   │  ← PHASE 3 (waits for Backend, optionally Marketing)
      │  UI + Pages  │
      └──────────────┘
                    \
                     ▼
                    ┌─────────────────────┐
                    │   CEO Orchestrator  │  ← PHASE 4 (final synthesis)
                    │   Final Summary     │
                    └─────────────────────┘
```

---

## Detailed Phase Breakdown

### Phase 0 — Swarm Initialization
**Who:** CEO Orchestrator  
**Process:** `node /workspace/agents/ceoOrchestrator.js` (spawned by orchestrator, phase 0 mode)  
**Duration:** ~5s  
**What happens:**
- Orchestrator spawns `ceoOrchestrator.js` as a child process
- The process emits `agent_started`, runs a quick pi-agent-core `Agent` prompt to parse the idea
- Writes `/workspace/state/context.json` — industry, audience, core problem — available to all agents
- Emits `agent_done`, writes state file, exits with code 0

**UI:** CEO card shows "Setting the stage..." with a subtle thinking animation

---

### Phase 1 — Product Planning (Serial)
**Who:** Product Manager  
**Duration:** ~45-90s  
**Depends on:** Phase 0 context  
**What it produces:** `/workspace/state/productManager.json`
```json
{
  "prd": "...",
  "userStories": [...],
  "roadmap": [...],
  "techRequirements": "...",
  "targetAudience": "...",
  "coreFeatures": [...]
}
```
**Why serial:** Every other agent needs this. No point starting them without it.  
**UI:** Only PM card is active. Other cards show "Waiting for Product Manager..." in amber.

---

### Phase 2 — Parallel Execution (Three processes at once)
**Triggered:** The moment `productManager.js` exits with code 0 — orchestrator's `Promise` for Phase 1 resolves

Orchestrator calls `Promise.all([spawnAgent('backendEngineer', 2), spawnAgent('marketingGrowth', 2), spawnAgent('contentPitch', 2)])` — three OS processes start near-simultaneously:

#### 2a — Backend Engineer
**Duration:** ~60-120s  
**Reads:** `context.json`, `productManager.json`  
**Produces:** `/workspace/state/backendEngineer.json`
```json
{
  "dbSchema": "...",
  "apiRoutes": [...],
  "dataModels": "...",
  "techStack": "...",
  "authStrategy": "..."
}
```

#### 2b — Marketing & Growth
**Duration:** ~45-90s  
**Reads:** `context.json`, `productManager.json`  
**Produces:** `/workspace/state/marketingGrowth.json`
```json
{
  "gtmStrategy": "...",
  "targetPersonas": [...],
  "socialPosts": [...],
  "campaignPlan": "...",
  "brandVoice": "...",
  "keyMessages": [...]
}
```

#### 2c — Content + Pitch Team
**Duration:** ~60-120s  
**Reads:** `context.json`, `productManager.json`  
**Produces:** `/workspace/state/contentPitch.json`
```json
{
  "pitchDeckOutline": [...],
  "investorOnePager": "...",
  "reelsScript": "...",
  "tagline": "...",
  "elevatorPitch": "..."
}
```

**UI behavior during Phase 2:**
- All three processes emit `agent_started` within milliseconds of each other → three cards flip amber → blue simultaneously — this is the visual moment
- Token streams appear inside each card from their own independent LLM HTTP streams
- A "Phase 2 — Running in parallel" label appears above the row
- Each process exits independently — Backend card might go green while Marketing and Content still pulse
- If one process crashes, only its card shows error; the other two continue unaffected

---

### Phase 3 — Frontend Engineering (Waits for Backend)
**Who:** Frontend Engineer  
**Triggered:** After `backendEngineer.json` is written  
**Duration:** ~60-120s  
**Reads:** `context.json`, `productManager.json`, `backendEngineer.json`, `marketingGrowth.json` (for brand/tone)  
**Produces:** `/workspace/state/frontendEngineer.json`
```json
{
  "pages": [...],
  "components": [...],
  "designSystem": "...",
  "userFlows": [...],
  "responsiveNotes": "..."
}
```

**Why waits for Backend:** Frontend needs the API contracts, auth strategy, and data models to design meaningful UI components and data flows.

**UI:** Card was amber saying "Waiting for Backend Engineer..." → goes blue when Backend's card turns green.

---

### Phase 4 — CEO Synthesis (Final)
**Who:** CEO Orchestrator  
**Triggered:** After all selected agents are done  
**Duration:** ~30-60s  
**Reads:** ALL state files  
**Produces:** `/workspace/state/ceoSummary.json`
```json
{
  "executiveSummary": "...",
  "criticalRisks": [...],
  "topPriorities": [...],
  "gaps": [...],
  "nextSteps": [...]
}
```
**UI:** CEO card animates last, reads "Synthesizing everything...", then the whole board turns green on `SWARM:COMPLETE`

---

## How Agents Communicate (Context Hand-off)

There is no direct process-to-process messaging. Communication is purely **sandbox filesystem-based**:

1. Each agent process saves its structured JSON output to `/workspace/state/agentName.json` before exiting
2. The next agent process reads all relevant files as the first thing it does (before creating the `Agent` instance)
3. The orchestrator's process sequencing (waiting for `process.exit(0)`) guarantees no agent reads a file before its dependency has written it

This is intentionally simple and reliable. The filesystem is the IPC mechanism between processes — no sockets, no pipes, no shared memory needed.

```
/workspace/state/         (inside Daytona sandbox)
├── context.json            ← CEO Phase 0
├── productManager.json     ← Phase 1 output
├── backendEngineer.json    ← Phase 2a output
├── marketingGrowth.json    ← Phase 2b output
├── contentPitch.json       ← Phase 2c output
├── frontendEngineer.json   ← Phase 3 output
└── ceoSummary.json         ← Phase 4 output
```

On `SWARM:COMPLETE`, these files are downloaded from the sandbox and zipped — the sandbox filesystem is ephemeral. The persistent record of outputs is in the `agent_outputs` Postgres table (written by the webhook handler when each `agent_done` event arrives).

---

## UI Design — The Dashboard

### Overall Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Startup Swarm                               [OpenAI / gpt-4o]  ⚙  │
│  "An app that helps remote teams..." ✓                             │
│                                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  72% complete          │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Phase 1                                             ✓ Done │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │ 📋 Product Manager                           ✓ Done   │  │  │
│  │  │ PRD · User Stories · Roadmap                          │  │  │
│  │  │ [View Output ▾]  [Improve]                            │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Phase 2 — Running in parallel                    ● Active  │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │  │
│  │  │ ⚙ Backend Eng.  │ │ 📣 Marketing    │ │ 🎬 Content  │  │  │
│  │  │ ● Working...    │ │ ✓ Done          │ │ ● Working..  │  │  │
│  │  │                 │ │                 │ │              │  │  │
│  │  │ "Designing the  │ │ [View Output ▾] │ │ "Drafting    │  │  │
│  │  │  auth flow for  │ │ [Improve]       │ │  pitch deck  │  │  │
│  │  │  user sessions  │ │                 │ │  section 2.."│  │  │
│  │  │  ..."           │ │                 │ │              │  │  │
│  │  └─────────────────┘ └─────────────────┘ └──────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Phase 3                                       ⏳ Waiting   │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │ 🖥 Frontend Engineer          ⏳ Waiting for Backend  │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Phase 4                                       ⏳ Waiting   │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │ 👑 CEO Orchestrator              ⏳ Waiting for all   │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

### Agent Card States

| State | Visual |
|---|---|
| **Idle** | Gray border, gray badge, no activity |
| **Waiting** | Amber border, "⏳ Waiting for [Agent]..." text, amber badge |
| **Working** | Blue border, pulsing blue dot, live token stream scrolling |
| **Done** | Green border, "✓ Done" badge, output preview collapsed, Improve button |
| **Error** | Red border, error message, retry option |

### Token Stream Component
When an agent is in "Working" state, the card body shows a live scrolling text area:
- New tokens append character by character (typewriter effect)
- Auto-scrolls to the latest output
- Fades older content to gray (keeps focus on latest)
- Capped at ~300 chars visible; full output available in "View Output" expander

### Phase Row Behavior
- Each phase has a container row with a phase label and aggregate status
- Phase 2 row pulses with a combined "Running in parallel" indicator while any agent is active
- Dependency arrows between Phase rows (simple SVG lines) shown as subtle connectors

---

## Event Sequence (What the Browser Receives)

Events flow like this:
```
Orchestrator (Daytona sandbox)
  → POST /api/webhook/[sessionId]   (each event)
  → INSERT INTO agent_events        (Postgres)
  → SSE polls agent_events          (every 500ms)
  → EventSource in browser          (React state update)
```

The event rows streamed to the browser:

```
{ eventType: 'phase_started',  phase: 0 }
{ eventType: 'agent_started',  agentName: 'ceoOrchestrator', phase: 0 }
{ eventType: 'agent_token',    agentName: 'ceoOrchestrator', chunk: 'Analyzing...' }
{ eventType: 'agent_done',     agentName: 'ceoOrchestrator', phase: 0 }
{ eventType: 'phase_done',     phase: 0 }

{ eventType: 'phase_started',  phase: 1 }
{ eventType: 'agent_started',  agentName: 'productManager', phase: 1 }
{ eventType: 'agent_token',    agentName: 'productManager', chunk: 'The core problem...' }
{ eventType: 'agent_token',    agentName: 'productManager', chunk: ' this app solves...' }
{ eventType: 'agent_done',     agentName: 'productManager', phase: 1 }
{ eventType: 'phase_done',     phase: 1 }

{ eventType: 'phase_started',  phase: 2 }
{ eventType: 'agent_started',  agentName: 'backendEngineer',  phase: 2 }   ← these three rows
{ eventType: 'agent_started',  agentName: 'marketingGrowth',  phase: 2 }   ← arrive almost
{ eventType: 'agent_started',  agentName: 'contentPitch',     phase: 2 }   ← simultaneously
{ eventType: 'agent_token',    agentName: 'backendEngineer',  chunk: 'Schema...' }
{ eventType: 'agent_token',    agentName: 'marketingGrowth',  chunk: 'Target audience...' }
{ eventType: 'agent_token',    agentName: 'contentPitch',     chunk: 'Slide 1...' }
...interleaved tokens from all three agents...
{ eventType: 'agent_done',     agentName: 'marketingGrowth',  phase: 2 }   ← each finishes
{ eventType: 'agent_done',     agentName: 'contentPitch',     phase: 2 }   ← independently
{ eventType: 'agent_done',     agentName: 'backendEngineer',  phase: 2 }
{ eventType: 'phase_done',     phase: 2 }

{ eventType: 'phase_started',  phase: 3 }
{ eventType: 'agent_started',  agentName: 'frontendEngineer', phase: 3 }
...
{ eventType: 'agent_done',     agentName: 'frontendEngineer', phase: 3 }
{ eventType: 'phase_done',     phase: 3 }

{ eventType: 'phase_started',  phase: 4 }
{ eventType: 'agent_started',  agentName: 'ceoOrchestrator',  phase: 4 }
...
{ eventType: 'agent_done',     agentName: 'ceoOrchestrator',  phase: 4 }
{ eventType: 'phase_done',     phase: 4 }

{ eventType: 'swarm_complete' }         ← webhook triggers zip + Blob upload
{ eventType: 'download_ready', payload: { downloadUrl: 'https://...' } }
```

Every one of these rows is **persisted in the `agent_events` Postgres table**. If the user closes the tab and reopens it, the SSE endpoint replays all rows from the beginning and the dashboard reconstructs its full state exactly — nothing is lost because the server restarted or a Vercel function instance was recycled.

React state for each agent card is updated purely by consuming this event stream.

---

## Iteration Flow (Post-Run)

After the swarm completes, each card shows an "Improve" button. When clicked:

1. Feedback textarea opens inline in the card
2. User types: *"Make the pitch deck more aggressive, focus on traction metrics"*
3. Click "Re-run this agent"
4. Browser POSTs `{ sessionId, agentName, feedback, apiKey }` to `/api/iterate`
5. Route extends `expiresAt` by 45 min — active iterating users never hit expiry mid-session
6. Route checks if sandbox is still alive (i.e. `expiresAt` hasn't passed)
7. Inserts a fresh `agent_started` event into `agent_events` → that card flips back to "Working..." state
8. Calls `sandbox.process.exec('node /workspace/agents/contentPitch.js', { env: { ...existingEnv, ITERATION_FEEDBACK: feedback } })` — spawns just that one agent process fresh
9. Process reads all prior state files from `/workspace/state/` + `ITERATION_FEEDBACK` → re-runs → POSTs token and done events → overwrites its own state file
10. Only that card animates; all other cards stay green and unchanged

**Why sandbox reuse works perfectly here:**
- The sandbox is still alive from the original run — no cold start, no re-upload, no `npm install`
- All other agents' state files (`productManager.json`, `backendEngineer.json`, etc.) are still on the filesystem
- The re-spawned process picks them up naturally as context
- Re-spawn to first token: under 1 second
- Users can iterate on multiple different agents in the same session, one after another

**If sandbox has expired (45+ min idle):**
- In v1: return a clear error — "Your session expired. Start a new swarm to continue."
- In v2: auto-recreate sandbox, re-run all phases silently, then apply iteration feedback

**Multiple iterations in a row:** Each click of "Re-run" extends `expiresAt` again — the 45-min clock resets every time the user is actively using the session.

The CEO Orchestrator can also be re-run after individual iterations to produce a fresh synthesis across all updated outputs. All events are persisted in `agent_events` — the full history of every run and re-run is in the DB.

---

## Landing Page Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       Startup Swarm                             │
│         Your AI founding team. Built in minutes.               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  What's your startup idea?                               │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ An app that helps remote teams run async standups  │  │  │
│  │  │ with AI summaries...                               │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AI Provider                                             │  │
│  │  ● OpenAI   ○ Anthropic   ○ OpenRouter                   │  │
│  │                                                          │  │
│  │  Model:  [gpt-4o ▼]                                      │  │
│  │  API Key: [sk-...                                   ]    │  │
│  │          🔒 Sent directly to sandbox, never stored       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Your Team  (toggle agents on/off)                       │  │
│  │  ✅ Product Manager    ✅ Backend Engineer                │  │
│  │  ✅ Frontend Engineer  ✅ Marketing & Growth              │  │
│  │  ✅ Content + Pitch    ✅ CEO Orchestrator (always on)    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│                  [ 🚀 Launch Your Swarm ]                       │
└─────────────────────────────────────────────────────────────────┘
```

On click: POST to `/api/spawn` → navigate to `/dashboard/[sessionId]` → SSE stream starts.
