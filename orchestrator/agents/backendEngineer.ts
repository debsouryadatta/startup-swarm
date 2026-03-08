// Backend Engineer — Phase 2a (runs in parallel with Marketing & Content)
// Designs DB schema, API routes, and tech stack based on the PRD

import { Agent }    from '@mariozechner/pi-agent-core'
import { getModel } from '@mariozechner/pi-ai'
import { emit, emitToken, flushTokens } from '../shared/webhook.js'
import { readState, writeState, extractText, extractJSON } from '../shared/state.js'

const AGENT_NAME   = 'backendEngineer'
const AGENT_PHASE  = Number(process.env.AGENT_PHASE ?? '2')
const idea         = process.env.IDEA!
const iterFeedback = process.env.ITERATION_FEEDBACK ?? null

const SYSTEM_PROMPT = `You are the Backend Engineer for a startup. Given the PRD, design the complete backend architecture.

Output ONLY valid JSON:
{
  "techStack": "string (e.g. Node.js + PostgreSQL + Redis)",
  "dbSchema": "string (describe tables, fields, and relationships clearly)",
  "apiRoutes": [{ "method": "string", "path": "string", "description": "string", "auth": true }],
  "dataModels": "string (key types and interfaces)",
  "authStrategy": "string (describe auth approach)",
  "scalingNotes": "string"
}`

await emit({ eventType: 'agent_started', agentName: AGENT_NAME, phase: AGENT_PHASE })

const prd   = await readState('productManager')
const model = getModel(process.env.LLM_PROVIDER as never, process.env.LLM_MODEL!)
const agent = new Agent({ initialState: { systemPrompt: SYSTEM_PROMPT, model } })

agent.subscribe(async event => {
  if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
    await emitToken(AGENT_NAME, event.assistantMessageEvent.delta)
  }
})

const prompt = `Startup idea: ${idea}

Product Manager's PRD:
${JSON.stringify(prd, null, 2)}
${iterFeedback ? `\nRevision feedback: ${iterFeedback}\n` : ''}
Design the backend architecture as JSON.`

await agent.prompt(prompt)

await flushTokens(AGENT_NAME)
const output = extractJSON(extractText(agent.state.messages.findLast(m => m.role === 'assistant')?.content))
await writeState(AGENT_NAME, output)
await emit({ eventType: 'agent_done', agentName: AGENT_NAME, phase: AGENT_PHASE, payload: { output } })

process.exit(0)
