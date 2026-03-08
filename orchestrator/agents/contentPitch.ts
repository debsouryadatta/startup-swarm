// Content + Pitch Team — Phase 2c (runs in parallel with Backend & Marketing)
// Produces pitch deck outline, investor one-pager, tagline, and reels script

import { Agent }    from '@mariozechner/pi-agent-core'
import { getModel } from '@mariozechner/pi-ai'
import { emit, emitToken, flushTokens } from '../shared/webhook.js'
import { readState, writeState, extractText, extractJSON } from '../shared/state.js'

const AGENT_NAME   = 'contentPitch'
const AGENT_PHASE  = Number(process.env.AGENT_PHASE ?? '2')
const idea         = process.env.IDEA!
const iterFeedback = process.env.ITERATION_FEEDBACK ?? null

const SYSTEM_PROMPT = `You are the Content & Pitch writer for a startup. Create investor-ready content and a viral launch strategy.

Output ONLY valid JSON:
{
  "tagline": "string (punchy 1-line tagline)",
  "elevatorPitch": "string (30-second pitch)",
  "pitchDeckOutline": [{ "slide": "number", "title": "string", "content": "string" }],
  "investorOnePager": "string (full one-pager as formatted text)",
  "reelsScript": "string (60-second short-form video script)",
  "pressRelease": "string (launch press release headline + first paragraph)"
}`

await emit({ eventType: 'agent_started', agentName: AGENT_NAME, phase: AGENT_PHASE })

const prd       = await readState('productManager')
const marketing = await readState('marketingGrowth')  // may be null if running in parallel
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
${marketing ? `\nMarketing Context:\n${JSON.stringify(marketing, null, 2)}` : ''}
${iterFeedback ? `\nRevision feedback: ${iterFeedback}\n` : ''}
Create all investor and content materials as JSON.`

await agent.prompt(prompt)

await flushTokens(AGENT_NAME)
const output = extractJSON(extractText(agent.state.messages.findLast(m => m.role === 'assistant')?.content))
await writeState(AGENT_NAME, output)
await emit({ eventType: 'agent_done', agentName: AGENT_NAME, phase: AGENT_PHASE, payload: { output } })

process.exit(0)
