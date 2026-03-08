'use client'

import { useEffect, useRef, useState, use } from 'react'
import { AgentGrid, AGENT_CONFIGS, DEFAULT_AGENT_STATE } from '@/components/AgentGrid'
import { AgentState }                                     from '@/components/AgentCard'
import { PreviewPanel }                                   from '@/components/PreviewPanel'
import { ArrowLeft, Download, Eye, X, AlertTriangle, Loader2, RefreshCw, PartyPopper, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface AgentEvent {
  id:        number
  eventType: string
  agentName: string | null
  phase:     number | null
  chunk:     string | null
  message:   string | null
  payload:   Record<string, unknown> | null
}

type AgentStates = Record<string, AgentState>

const TOTAL_AGENTS = AGENT_CONFIGS.length + 1  // +1 for CEO phase 4

export default function DashboardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)

  const [agentStates,     setAgentStates]     = useState<AgentStates>({})
  const [activePhase,     setActivePhase]     = useState(0)
  const [doneCount,       setDoneCount]       = useState(0)
  const [downloadUrl,     setDownloadUrl]     = useState<string | null>(null)
  const [swarmDone,       setSwarmDone]       = useState(false)
  const [swarmCancelled,  setSwarmCancelled]  = useState(false)
  const [connecting,      setConnecting]      = useState(true)
  const [stalled,         setStalled]         = useState(false)
  const [showPreview,     setShowPreview]     = useState(false)
  const [previewKey,      setPreviewKey]      = useState<string | undefined>(undefined)
  const [showStopModal,    setShowStopModal]    = useState(false)
  const [showDeleteModal,  setShowDeleteModal]  = useState(false)
  const [showIterateModal, setShowIterateModal] = useState(false)
  const [actionLoading,    setActionLoading]    = useState(false)

  // Iteration metadata — populated from the session snapshot
  const [sessionIdea,           setSessionIdea]           = useState('')
  const [sessionLlmProvider,    setSessionLlmProvider]    = useState('')
  const [sessionLlmModel,       setSessionLlmModel]       = useState('')
  const [sessionSelectedAgents, setSessionSelectedAgents] = useState<string[]>([])

  const apiKey       = useRef<string>('')
  const lastEventAt  = useRef<number>(Date.now())
  const streamClosed = useRef(false)
  const lastSeenId   = useRef<number>(0)
  const pollTimer    = useRef<number>(0)

  useEffect(() => {
    const prefs = JSON.parse(localStorage.getItem('swarm_prefs') ?? '{}')
    apiKey.current = prefs.apiKey ?? ''
  }, [])

  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then(r => r.json())
      .then((data: {
        status:         string
        downloadUrl:    string | null
        activePhase:    number
        outputs:        Record<string, Record<string, unknown> | null>
        isDone:         boolean
        isCancelled:    boolean
        lastEventId:    number
        error?:         string
        idea?:          string
        llmProvider?:   string
        llmModel?:      string
        selectedAgents?: string[]
      }) => {
        if (data.error) return
        setActivePhase(data.activePhase)
        if (data.downloadUrl)    setDownloadUrl(data.downloadUrl)
        if (data.isDone)         { setSwarmDone(true);      streamClosed.current = true }
        if (data.isCancelled)    { setSwarmCancelled(true); streamClosed.current = true }
        // Seed poll position so we don't replay events already reflected in the snapshot
        if (data.lastEventId)    lastSeenId.current = data.lastEventId
        if (data.idea)           setSessionIdea(data.idea)
        if (data.llmProvider)    setSessionLlmProvider(data.llmProvider)
        if (data.llmModel)       setSessionLlmModel(data.llmModel)
        if (data.selectedAgents) setSessionSelectedAgents(data.selectedAgents)

        if (Object.keys(data.outputs).length > 0) {
          setConnecting(false)
          const states: AgentStates = {}
          let count = 0
          for (const [agentName, output] of Object.entries(data.outputs)) {
            // ceoOrchestrator_4 is the CEO's final-synthesis run (phase 4)
            const phase = agentName === 'ceoOrchestrator_4' ? 4
              : (AGENT_CONFIGS.find(c => c.name === agentName)?.phase ?? 0)
            states[agentName] = { status: 'done', tokens: '', output, phase }
            count++
          }
          setAgentStates(states)
          setDoneCount(count)
        }
      })
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    if (streamClosed.current) return
    let active = true

    const poll = async () => {
      if (!active || streamClosed.current) return
      try {
        const res = await fetch(`/api/poll/${sessionId}?after=${lastSeenId.current}`)
        if (!res.ok) return
        const { events, done } = await res.json() as { events: AgentEvent[]; done: boolean }

        if (events.length > 0) {
          setConnecting(false)
          lastEventAt.current = Date.now()
          setStalled(false)
          for (const event of events) {
            lastSeenId.current = event.id
            processEvent(event)
          }
        } else {
          // Got a response even with no events → connection is live
          setConnecting(false)
        }

        if (done) {
          streamClosed.current = true
          return
        }
      } catch {
        // network error — will retry on next tick
      }

      if (active && !streamClosed.current) {
        pollTimer.current = window.setTimeout(poll, 2000)
      }
    }

    poll()
    return () => {
      active = false
      clearTimeout(pollTimer.current)
    }
  }, [sessionId])

  useEffect(() => {
    if (swarmDone || swarmCancelled) return
    const timer = setInterval(() => {
      if (Date.now() - lastEventAt.current > 3 * 60_000 && doneCount < TOTAL_AGENTS) {
        setStalled(true)
      }
    }, 30_000)
    return () => clearInterval(timer)
  }, [swarmDone, swarmCancelled, doneCount])

  const processEvent = (event: AgentEvent) => {
    const { eventType, agentName, phase, chunk, payload } = event

    setAgentStates(prev => {
      const next = { ...prev }

      if (eventType === 'phase_started' && phase !== null) {
        setActivePhase(phase)
        return next
      }
      if (eventType === 'agent_started' && agentName) {
        const key = agentName === 'ceoOrchestrator' && phase === 4 ? 'ceoOrchestrator_4' : agentName
        next[key] = { status: 'working', tokens: '', output: null, phase: phase ?? 0 }
        return next
      }
      if (eventType === 'agent_token' && agentName && chunk) {
        const key = agentName === 'ceoOrchestrator'
          ? (prev['ceoOrchestrator_4']?.status === 'working' ? 'ceoOrchestrator_4' : agentName)
          : agentName
        const cur = next[key] ?? { ...DEFAULT_AGENT_STATE }
        next[key] = { ...cur, tokens: cur.tokens + chunk }
        return next
      }
      if (eventType === 'agent_done' && agentName) {
        const key = agentName === 'ceoOrchestrator' && phase === 4 ? 'ceoOrchestrator_4' : agentName
        const cur = next[key] ?? { ...DEFAULT_AGENT_STATE }
        next[key] = { ...cur, status: 'done', output: (payload?.output as Record<string, unknown>) ?? null, phase: phase ?? cur.phase }
        setDoneCount(c => c + 1)
        return next
      }
      if (eventType === 'agent_error' && agentName) {
        const key = agentName === 'ceoOrchestrator' && (phase === 4 || prev['ceoOrchestrator_4']?.status === 'working')
          ? 'ceoOrchestrator_4' : agentName
        const cur = next[key] ?? { ...DEFAULT_AGENT_STATE }
        next[key] = { ...cur, status: 'error' }
        return next
      }
      return next
    })

    if (eventType === 'swarm_complete')  setSwarmDone(true)
    if (eventType === 'swarm_cancelled') setSwarmCancelled(true)
    if (eventType === 'download_ready' && payload?.downloadUrl) {
      setDownloadUrl(payload.downloadUrl as string)
    }
  }

  const enrichedStates = (): AgentStates => {
    const result: AgentStates = {}
    for (const config of AGENT_CONFIGS) {
      const state = agentStates[config.name]
      if (state) {
        result[config.name] = state
      } else if (config.phase <= activePhase) {
        result[config.name] = { status: 'waiting', tokens: '', output: null, phase: config.phase }
      } else {
        result[config.name] = DEFAULT_AGENT_STATE
      }
    }
    const ceo4 = agentStates['ceoOrchestrator_4']
    if (ceo4) result['ceoOrchestrator_4'] = ceo4
    else if (activePhase >= 4) result['ceoOrchestrator_4'] = { status: 'waiting', tokens: '', output: null, phase: 4 }
    return result
  }

  const handleIterate = () => {
    const params = new URLSearchParams()
    if (sessionIdea)           params.set('idea',    sessionIdea)
    if (sessionLlmProvider)    params.set('provider', sessionLlmProvider)
    if (sessionLlmModel)       params.set('model',   sessionLlmModel)
    if (sessionSelectedAgents.length > 0) {
      const withoutCeo = sessionSelectedAgents.filter(a => a !== 'ceoOrchestrator')
      params.set('agents', withoutCeo.join(','))
    }
    window.location.href = `/launch?${params.toString()}`
  }

  const handleStop = async () => {
    setActionLoading(true)
    try {
      await fetch('/api/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) })
      setSwarmCancelled(true)
    } finally { setActionLoading(false); setShowStopModal(false) }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      await fetch(`/api/session/${sessionId}`, { method: 'DELETE' })
      window.location.href = '/history'
    } finally { setActionLoading(false); setShowDeleteModal(false) }
  }

  const handleSelectAgent = (key: string) => {
    setPreviewKey(key)
    setShowPreview(true)
  }

  const workingCount = Object.values(agentStates).filter(s => s.status === 'working').length
  const progress = swarmDone
    ? 100
    : Math.min(99, Math.round(((doneCount + workingCount * 0.5) / TOTAL_AGENTS) * 100))

  const states = enrichedStates()

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">

      {/* Preview overlay */}
      {showPreview && (
        <PreviewPanel
          agentStates={states}
          initialKey={previewKey}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Stop modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Stop this swarm?</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed pl-12">
              Running agents will be stopped and the sandbox destroyed. Your session data is preserved.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowStopModal(false)} disabled={actionLoading}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors disabled:opacity-50">
                Keep running
              </button>
              <button onClick={handleStop} disabled={actionLoading}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                {actionLoading && <Loader2 size={13} className="animate-spin" />}
                {actionLoading ? 'Stopping...' : 'Yes, stop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Iterate modal */}
      {showIterateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
                <RefreshCw size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Iterate on this swarm?</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed pl-12">
              You&apos;ll be taken to the launch page with your idea and settings pre-filled. You can tweak anything before re-launching.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowIterateModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors">
                Cancel
              </button>
              <button onClick={() => { setShowIterateModal(false); handleIterate() }}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <RefreshCw size={13} />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
                <X size={16} className="text-red-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Delete this session?</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed pl-12">
              All agent data and the sandbox will be permanently destroyed.{' '}
              <span className="text-red-500 font-medium">This cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)} disabled={actionLoading}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors disabled:opacity-50">
                Keep it
              </button>
              <button onClick={handleDelete} disabled={actionLoading}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                {actionLoading && <Loader2 size={13} className="animate-spin" />}
                {actionLoading ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/history" className="flex items-center gap-1.5 hover:text-gray-700 transition-colors">
            <ArrowLeft size={13} />
            History
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-semibold">Startup Swarm</span>
        </div>

        {/* Header card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5 mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            {/* Status text */}
            <div className="min-w-0">
              {connecting && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={13} className="animate-spin" />
                  Connecting to stream…
                </div>
              )}
              {swarmDone && (
                <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5"><PartyPopper size={14} /> All agents complete</p>
              )}
              {swarmCancelled && !swarmDone && (
                <p className="text-sm font-semibold text-amber-600 flex items-center gap-1.5"><AlertTriangle size={14} /> Swarm cancelled</p>
              )}
              {stalled && !swarmDone && !swarmCancelled && (
                <p className="text-sm text-orange-500 font-medium flex items-center gap-1.5"><AlertTriangle size={14} /> No activity for 3+ min — may be stalled.</p>
              )}
              {!connecting && !swarmDone && !swarmCancelled && !stalled && (
                <p className="text-sm text-gray-500">
                  {workingCount > 0
                    ? `Phase ${activePhase} · ${workingCount} agent${workingCount > 1 ? 's' : ''} working`
                    : `Phase ${activePhase} · setting up…`}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {doneCount > 0 && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Eye size={14} />
                  Preview
                </button>
              )}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Download Kit</span>
                  <span className="sm:hidden">Download</span>
                </a>
              )}
              {(swarmDone || swarmCancelled) && sessionIdea && (
                <button
                  onClick={() => setShowIterateModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                  title="Re-launch with the same idea (you can edit it before running)"
                >
                  <RefreshCw size={13} />
                  Iterate
                </button>
              )}
              {!swarmDone && !swarmCancelled && (
                <button onClick={() => setShowStopModal(true)}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                  Stop
                </button>
              )}
              <button onClick={() => setShowDeleteModal(true)}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                title="Delete session"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">
                {swarmDone      ? 'Swarm complete — click Preview to explore results' :
                 swarmCancelled ? 'Cancelled' :
                 connecting     ? 'Connecting...' :
                 workingCount > 0
                   ? `${doneCount} of ${TOTAL_AGENTS} done`
                   : doneCount > 0
                     ? `${doneCount} of ${TOTAL_AGENTS} done`
                     : 'Starting…'}
              </span>
              <span className="text-xs tabular-nums font-semibold text-gray-500">{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  swarmDone ? 'bg-green-500' : swarmCancelled ? 'bg-amber-400' : 'bg-indigo-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Agent grid */}
        <AgentGrid
          agentStates={states}
          activePhase={activePhase}
          selectedKey={previewKey ?? null}
          onSelect={handleSelectAgent}
        />

        {/* Session ID */}
        <p className="mt-8 text-center text-[11px] text-gray-300 font-mono select-all">
          {sessionId}
        </p>
      </div>
    </main>
  )
}
