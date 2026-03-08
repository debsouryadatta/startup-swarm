// Marketing & Growth — Phase 2b (runs in parallel with Backend & Content)
// Creates GTM strategy, personas, social content, and brand voice

import { Agent }    from '@mariozechner/pi-agent-core'
import { getModel } from '@mariozechner/pi-ai'
import { emit, emitToken, flushTokens } from '../shared/webhook.js'
import { readState, writeState, extractText, extractJSON } from '../shared/state.js'

const AGENT_NAME   = 'marketingGrowth'
const AGENT_PHASE  = Number(process.env.AGENT_PHASE ?? '2')
const idea         = process.env.IDEA!
const iterFeedback = process.env.ITERATION_FEEDBACK ?? null

const SYSTEM_PROMPT = `You are the Marketing & Growth lead for a startup. Given the PRD, create a complete go-to-market plan.

Output ONLY valid JSON:
{
  "gtmStrategy": "string (detailed launch strategy)",
  "targetPersonas": [{ "name": "string", "age": "string", "pain": "string", "channel": "string" }],
  "brandVoice": "string (tone, personality, key adjectives)",
  "keyMessages": ["string"],
  "socialPosts": [{ "platform": "string", "copy": "string", "hashtags": ["string"] }],
  "campaignPlan": "string (first 30-day campaign outline)",
  "pricingStrategy": "string"
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
Create the full GTM plan as JSON.`

await agent.prompt(prompt)

await flushTokens(AGENT_NAME)
const output = extractJSON(extractText(agent.state.messages.findLast(m => m.role === 'assistant')?.content))
await writeState(AGENT_NAME, output)
await emit({ eventType: 'agent_done', agentName: AGENT_NAME, phase: AGENT_PHASE, payload: { output } })

process.exit(0)
