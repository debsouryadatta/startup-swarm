// Frontend Engineer — Phase 3 (waits for Backend's API contracts)
// Designs pages, components, and user flows based on PRD + Backend schema

import { Agent }    from '@mariozechner/pi-agent-core'
import { getModel } from '@mariozechner/pi-ai'
import { emit, emitToken, flushTokens } from '../shared/webhook.js'
import { readState, writeState, extractText, extractJSON } from '../shared/state.js'

const AGENT_NAME   = 'frontendEngineer'
const AGENT_PHASE  = Number(process.env.AGENT_PHASE ?? '3')
const idea         = process.env.IDEA!
const iterFeedback = process.env.ITERATION_FEEDBACK ?? null

const SYSTEM_PROMPT = `You are the Frontend Engineer for a startup. Given the PRD, backend API contracts, and brand guidelines, design the complete frontend.

Output ONLY valid JSON:
{
  "techStack": "string (e.g. React + Next.js + Tailwind)",
  "pages": [{ "path": "string", "name": "string", "description": "string", "components": ["string"] }],
  "components": [{ "name": "string", "description": "string", "props": "string" }],
  "designSystem": "string (colors, typography, spacing guidelines)",
  "userFlows": [{ "name": "string", "steps": ["string"] }],
  "responsiveNotes": "string",
  "stateManagement": "string"
}`

await emit({ eventType: 'agent_started', agentName: AGENT_NAME, phase: AGENT_PHASE })

const prd       = await readState('productManager')
const backend   = await readState('backendEngineer')
const marketing = await readState('marketingGrowth')
const model     = getModel(process.env.LLM_PROVIDER as never, process.env.LLM_MODEL!)
const agent     = new Agent({ initialState: { systemPrompt: SYSTEM_PROMPT, model } })

agent.subscribe(async event => {
  if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
    await emitToken(AGENT_NAME, event.assistantMessageEvent.delta)
  }
})

const prompt = `Startup idea: ${idea}

Product Manager's PRD:
${JSON.stringify(prd, null, 2)}

Backend Architecture:
${JSON.stringify(backend, null, 2)}
${marketing ? `\nBrand Voice & Personas:\n${JSON.stringify({ brandVoice: (marketing as Record<string, unknown>).brandVoice, targetPersonas: (marketing as Record<string, unknown>).targetPersonas }, null, 2)}` : ''}
${iterFeedback ? `\nRevision feedback: ${iterFeedback}\n` : ''}
Design the complete frontend as JSON.`

await agent.prompt(prompt)

await flushTokens(AGENT_NAME)
const output = extractJSON(extractText(agent.state.messages.findLast(m => m.role === 'assistant')?.content))
await writeState(AGENT_NAME, output)
await emit({ eventType: 'agent_done', agentName: AGENT_NAME, phase: AGENT_PHASE, payload: { output } })

process.exit(0)
