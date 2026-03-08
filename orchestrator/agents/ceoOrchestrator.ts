// CEO Orchestrator — Phase 0: parse idea & set context / Phase 4: final synthesis
// Spawned as its own process. AGENT_PHASE tells it which role to play.

import { Agent }    from '@mariozechner/pi-agent-core'
import { getModel } from '@mariozechner/pi-ai'
import { emit, emitToken, flushTokens } from '../shared/webhook.js'
import { readAllState, readState, writeState, extractText, extractJSON } from '../shared/state.js'

const AGENT_NAME  = 'ceoOrchestrator'
const AGENT_PHASE = Number(process.env.AGENT_PHASE ?? '0')
const idea        = process.env.IDEA!
const iterFeedback = process.env.ITERATION_FEEDBACK ?? null

await emit({ eventType: 'agent_started', agentName: AGENT_NAME, phase: AGENT_PHASE })

const model = getModel(process.env.LLM_PROVIDER as never, process.env.LLM_MODEL!)
const agent = new Agent({ initialState: { systemPrompt: buildSystemPrompt(), model } })

agent.subscribe(async event => {
  if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
    await emitToken(AGENT_NAME, event.assistantMessageEvent.delta)
  }
})

if (AGENT_PHASE === 0) {
  // Phase 0: parse the idea and set global context
  const prompt = iterFeedback
    ? `Startup idea: ${idea}\n\nRevision feedback: ${iterFeedback}\n\nRe-analyze and produce updated context JSON.`
    : `Startup idea: ${idea}\n\nAnalyze and produce context JSON.`

  await agent.prompt(prompt)
  await flushTokens(AGENT_NAME)
  const output = extractJSON(extractText(agent.state.messages.findLast(m => m.role === 'assistant')?.content))
  await writeState(AGENT_NAME, output)
  await emit({ eventType: 'agent_done', agentName: AGENT_NAME, phase: AGENT_PHASE, payload: { output } })

} else {
  // Phase 4: read all outputs and write final synthesis
  const allState = await readAllState()
  const prompt   = `Startup idea: ${idea}\n\nAll team outputs:\n${JSON.stringify(allState, null, 2)}\n\n${
    iterFeedback ? `Revision feedback: ${iterFeedback}\n\n` : ''
  }Produce final executive summary JSON.`

  await agent.prompt(prompt)
  await flushTokens(AGENT_NAME)
  const output = extractJSON(extractText(agent.state.messages.findLast(m => m.role === 'assistant')?.content))
  await writeState(AGENT_NAME, output)
  await emit({ eventType: 'agent_done', agentName: AGENT_NAME, phase: AGENT_PHASE, payload: { output } })
}

process.exit(0)

function buildSystemPrompt(): string {
  if (AGENT_PHASE === 0) {
    return `You are the CEO of a startup. Given a startup idea, quickly analyze it and produce a brief context JSON.

Output ONLY valid JSON:
{
  "industry": "string",
  "targetAudience": "string",
  "coreProblem": "string",
  "uniqueValue": "string",
  "keyRisks": ["string"]
}`
  }
  return `You are the CEO of a startup. You have just received reports from your entire founding team.
Synthesize all their work into a sharp executive summary.

Output ONLY valid JSON:
{
  "executiveSummary": "string",
  "criticalRisks": ["string"],
  "topPriorities": ["string"],
  "gaps": ["string"],
  "nextSteps": ["string"]
}`
}
