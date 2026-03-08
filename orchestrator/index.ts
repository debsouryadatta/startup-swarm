// DAG Process Manager — runs INSIDE the Daytona sandbox
// Spawns each agent as a separate child process and sequences phases

import { spawn }  from 'child_process'
import { emit }   from './shared/webhook.js'

// Map our single LLM_API_KEY to the provider-specific env var pi-ai reads automatically
const provider = process.env.LLM_PROVIDER!
const apiKey   = process.env.LLM_API_KEY!
if (provider === 'openai')     process.env.OPENAI_API_KEY     = apiKey
if (provider === 'anthropic')  process.env.ANTHROPIC_API_KEY  = apiKey
if (provider === 'openrouter') process.env.OPENROUTER_API_KEY = apiKey

const selectedAgents = process.env.SELECTED_AGENTS!.split(',')
const has = (name: string) => selectedAgents.includes(name)

// Base dir is the sandbox user's home (set automatically by the OS)
const HOME = process.env.HOME || '/home/daytona'
const TSX  = `${HOME}/node_modules/.bin/tsx`

function spawnAgent(agentName: string, phase: number): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[orchestrator] spawning ${agentName} (phase ${phase})`)

    const proc = spawn(TSX, [`${HOME}/agents/${agentName}.ts`], {
      env:   { ...process.env, AGENT_PHASE: String(phase) },
      stdio: 'inherit',
    })

    proc.on('exit', code => {
      if (code === 0) {
        console.log(`[orchestrator] ${agentName} done`)
        resolve()
      } else {
        console.error(`[orchestrator] ${agentName} exited with code ${code}`)
        // Emit error event but don't crash the whole DAG
        emit({ eventType: 'agent_error', agentName, phase, message: `Exited with code ${code}` })
          .then(() => resolve())  // resolve so other phases continue
      }
    })

    proc.on('error', err => {
      console.error(`[orchestrator] failed to spawn ${agentName}:`, err)
      emit({ eventType: 'agent_error', agentName, phase, message: err.message })
        .then(() => resolve())
    })
  })
}

// ── Phase 0: CEO sets global context ─────────────────────────────────────────
await emit({ eventType: 'phase_started', phase: 0 })
await spawnAgent('ceoOrchestrator', 0)
await emit({ eventType: 'phase_done', phase: 0 })

// ── Phase 1: Product Manager (everyone depends on this) ───────────────────────
await emit({ eventType: 'phase_started', phase: 1 })
if (has('productManager')) await spawnAgent('productManager', 1)
await emit({ eventType: 'phase_done', phase: 1 })

// ── Phase 2: Backend + Marketing + Content in TRUE parallel ───────────────────
await emit({ eventType: 'phase_started', phase: 2 })
await Promise.all([
  has('backendEngineer') ? spawnAgent('backendEngineer', 2) : Promise.resolve(),
  has('marketingGrowth') ? spawnAgent('marketingGrowth', 2) : Promise.resolve(),
  has('contentPitch')    ? spawnAgent('contentPitch',    2) : Promise.resolve(),
])
await emit({ eventType: 'phase_done', phase: 2 })

// ── Phase 3: Frontend (waits for Backend's API contracts) ─────────────────────
await emit({ eventType: 'phase_started', phase: 3 })
if (has('frontendEngineer')) await spawnAgent('frontendEngineer', 3)
await emit({ eventType: 'phase_done', phase: 3 })

// ── Phase 4: CEO synthesizes all outputs ─────────────────────────────────────
await emit({ eventType: 'phase_started', phase: 4 })
await spawnAgent('ceoOrchestrator', 4)
await emit({ eventType: 'phase_done', phase: 4 })

// ── Done — triggers zip + upload in the webhook handler ──────────────────────
await emit({ eventType: 'swarm_complete' })
console.log('[orchestrator] swarm complete')
