// Product Manager — Phase 1
// Produces the PRD and roadmap that all other agents depend on

import { Agent }    from '@mariozechner/pi-agent-core'
import { getModel } from '@mariozechner/pi-ai'
import { emit, emitToken, flushTokens } from '../shared/webhook.js'
import { readState, writeState, extractText, extractJSON } from '../shared/state.js'

const AGENT_NAME   = 'productManager'
const AGENT_PHASE  = Number(process.env.AGENT_PHASE ?? '1')
const idea         = process.env.IDEA!
const iterFeedback = process.env.ITERATION_FEEDBACK ?? null

const SYSTEM_PROMPT = `You are the Product Manager for a startup. Given the startup idea and CEO context, produce a complete PRD.

Output ONLY valid JSON:
{
  "prd": "detailed product requirements document as a string",
  "userStories": [{ "as": "string", "iWant": "string", "soThat": "string" }],
  "roadmap": [{ "phase": "string", "duration": "string", "milestones": ["string"] }],
  "techRequirements": "string",
  "targetAudience": "string",
  "coreFeatures": [{ "name": "string", "description": "string", "priority": "high|medium|low" }]
}`

await emit({ eventType: 'agent_started', agentName: AGENT_NAME, phase: AGENT_PHASE })

const context = await readState('ceoOrchestrator')
const model   = getModel(process.env.LLM_PROVIDER as never, process.env.LLM_MODEL!)
const agent   = new Agent({ initialState: { systemPrompt: SYSTEM_PROMPT, model } })

agent.subscribe(async event => {
  if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
    await emitToken(AGENT_NAME, event.assistantMessageEvent.delta)
  }
})

const prompt = `Startup idea: ${idea}

CEO Context:
${JSON.stringify(context, null, 2)}
${iterFeedback ? `\nRevision feedback: ${iterFeedback}\n` : ''}
Produce the full PRD as JSON.`

await agent.prompt(prompt)

await flushTokens(AGENT_NAME)
const output = extractJSON(extractText(agent.state.messages.findLast(m => m.role === 'assistant')?.content))
await writeState(AGENT_NAME, output)
await emit({ eventType: 'agent_done', agentName: AGENT_NAME, phase: AGENT_PHASE, payload: { output } })

process.exit(0)
