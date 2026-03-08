// Runs inside Daytona sandbox — sends events to the Next.js webhook endpoint

const WEBHOOK_URL    = process.env.WEBHOOK_URL!
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!

export interface WebhookEvent {
  eventType: string
  agentName?: string
  phase?: number
  chunk?: string
  message?: string
  payload?: Record<string, unknown>
}

export async function emit(event: WebhookEvent): Promise<void> {
  try {
    await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ secret: WEBHOOK_SECRET, ...event }),
    })
  } catch (err) {
    // Log but never crash — webhook failures should not stop the agent
    console.error(`[webhook] emit failed for ${event.eventType}:`, err)
  }
}

// ── Token batching ────────────────────────────────────────────────────────────
// LLMs emit one token per event. Sending an individual HTTP POST per token
// floods ngrok/proxies with hundreds of connections and causes ECONNRESET.
// Buffer tokens and flush every BATCH_CHARS characters OR every FLUSH_MS ms,
// whichever comes first.
const BATCH_CHARS = 80
const FLUSH_MS    = 150

const _tokenBuf: Map<string, string>                        = new Map()
const _timers:   Map<string, ReturnType<typeof setTimeout>> = new Map()

async function _flushTokens(agentName: string): Promise<void> {
  const chunk = _tokenBuf.get(agentName)
  if (!chunk) return
  _tokenBuf.delete(agentName)
  if (_timers.has(agentName)) {
    clearTimeout(_timers.get(agentName)!)
    _timers.delete(agentName)
  }
  await emit({ eventType: 'agent_token', agentName, chunk })
}

/** Call this instead of emit() for streaming token chunks. */
export async function emitToken(agentName: string, chunk: string): Promise<void> {
  const current = (_tokenBuf.get(agentName) ?? '') + chunk
  _tokenBuf.set(agentName, current)

  if (current.length >= BATCH_CHARS) {
    await _flushTokens(agentName)
    return
  }

  // Schedule a flush so the last partial batch still goes out promptly
  if (_timers.has(agentName)) clearTimeout(_timers.get(agentName)!)
  _timers.set(agentName, setTimeout(() => _flushTokens(agentName), FLUSH_MS))
}

/** Flush any remaining buffered tokens — call before agent_done. */
export async function flushTokens(agentName: string): Promise<void> {
  await _flushTokens(agentName)
}
