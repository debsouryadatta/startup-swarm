'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { PROVIDERS, DEFAULT_PROVIDER, ProviderId } from '@/lib/llmProviders'
import { Rocket, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react'

const ALL_AGENTS = [
  { name: 'productManager',   label: 'Product Manager',    initials: 'PM' },
  { name: 'backendEngineer',  label: 'Backend Engineer',   initials: 'BE' },
  { name: 'frontendEngineer', label: 'Frontend Engineer',  initials: 'FE' },
  { name: 'marketingGrowth',  label: 'Marketing & Growth', initials: 'MG' },
  { name: 'contentPitch',     label: 'Content + Pitch',    initials: 'CP' },
]

function LaunchForm() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const [idea,           setIdea]           = useState('')
  const [provider,       setProvider]       = useState<ProviderId>(DEFAULT_PROVIDER)
  const [model,          setModel]          = useState(PROVIDERS[DEFAULT_PROVIDER].defaultModel)
  const [selectedAgents, setSelectedAgents] = useState(ALL_AGENTS.map(a => a.name))
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [upgradeRequired,  setUpgradeRequired]  = useState(false)
  const [iterating,        setIterating]        = useState(false)
  const [activeSessionId,  setActiveSessionId]  = useState<string | null>(null)

  useEffect(() => {
    // Check for iteration params first (they take precedence over saved prefs)
    const paramIdea     = searchParams.get('idea')
    const paramProvider = searchParams.get('provider') as ProviderId | null
    const paramModel    = searchParams.get('model')
    const paramAgents   = searchParams.get('agents')

    if (paramIdea || paramProvider || paramModel || paramAgents) {
      setIterating(true)
      if (paramIdea) setIdea(decodeURIComponent(paramIdea))
      if (paramProvider && PROVIDERS[paramProvider] && !PROVIDERS[paramProvider].comingSoon) {
        setProvider(paramProvider)
        setModel(PROVIDERS[paramProvider].defaultModel)
      }
      if (paramModel) setModel(paramModel)
      if (paramAgents) {
        const agentList = paramAgents.split(',').filter(a => ALL_AGENTS.some(ag => ag.name === a))
        if (agentList.length > 0) setSelectedAgents(agentList)
      }
      return
    }

    // Fall back to saved prefs
    const saved = localStorage.getItem('swarm_prefs')
    if (saved) {
      try {
        const p = JSON.parse(saved)
        if (p.provider && !PROVIDERS[p.provider as ProviderId]?.comingSoon) setProvider(p.provider)
        if (p.model) setModel(p.model)
      } catch { /* ignore */ }
    }
  }, [searchParams])

  const savePrefs = (p: ProviderId, m: string) =>
    localStorage.setItem('swarm_prefs', JSON.stringify({ provider: p, model: m }))

  const toggleAgent = (name: string) =>
    setSelectedAgents(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    )

  const handleLaunch = async () => {
    if (!idea.trim()) { setError('Please describe your startup idea.'); return }
    setError('')
    setUpgradeRequired(false)
    setActiveSessionId(null)
    setLoading(true)
    savePrefs(provider, model)
    const sessionId = crypto.randomUUID()
    try {
      const res  = await fetch('/api/spawn', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sessionId, idea: idea.trim(),
          selectedAgents: ['ceoOrchestrator', ...selectedAgents],
          llmProvider: provider, llmModel: model,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.existingSessionId) {
          setActiveSessionId(data.existingSessionId)
          setError('You already have an active swarm running.')
          return
        }
        if (res.status === 403 && data.upgradeRequired) {
          setUpgradeRequired(true)
          setError(data.error)
          return
        }
        setError(data.error ?? 'Something went wrong.')
        return
      }
      router.push(`/dashboard/${data.sessionId}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const config      = PROVIDERS[provider]
  const providerIds = Object.keys(PROVIDERS) as ProviderId[]

  return (
    <div className="relative min-h-full bg-[#fafafa] text-gray-900">
      {/* Background tints */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-60 -left-60 w-[700px] h-[700px] rounded-full bg-indigo-100/50 blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Iteration banner */}
        {iterating && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 shrink-0">
              <RefreshCw size={15} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-800">Iterating on a previous swarm</p>
              <p className="text-xs text-indigo-500 mt-0.5">Your idea and settings are pre-filled. Edit anything before launching.</p>
            </div>
          </div>
        )}

        {/* Page header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-medium text-gray-500 mb-7">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
            </span>
            {selectedAgents.length + 1} agents standing by
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            <span className="block leading-[1.15]">{iterating ? 'Refine your' : 'Configure your'}</span>
            <span className="block italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 py-2 leading-[1.25]">
              {iterating ? 'idea.' : 'founding team.'}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            {iterating ? 'Tweak your idea or swap agents, then re-launch.' : 'Describe your idea, choose your agents, and launch.'}
          </p>
        </div>

        {/* Main grid */}
        <div className="grid md:grid-cols-[1fr_340px] lg:grid-cols-[1fr_380px] gap-5 items-start">

          {/* Left column */}
          <div className="space-y-5">

            {/* Idea card */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-800">Your startup idea</label>
                <span className="text-xs text-gray-300 tabular-nums">{idea.length}/500</span>
              </div>
              <textarea
                value={idea}
                onChange={e => setIdea(e.target.value.slice(0, 500))}
                placeholder="e.g. An app that helps remote teams run async standups with AI summaries and automatic action items..."
                rows={5}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-400">Be specific — the more context you give, the better your swarm will perform.</p>
            </div>

            {/* Agent selection card */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-800">Your team</label>
                <span className="text-xs text-gray-400">{selectedAgents.length + 1} agents active</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_AGENTS.map(agent => {
                  const active = selectedAgents.includes(agent.name)
                  return (
                    <button
                      key={agent.name}
                      onClick={() => toggleAgent(agent.name)}
                      className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                        active
                          ? 'border-indigo-200 bg-indigo-50 hover:border-indigo-300'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                        active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {agent.initials}
                      </div>
                      <span className={`text-sm font-medium flex-1 transition-colors ${
                        active ? 'text-indigo-700' : 'text-gray-600'
                      }`}>
                        {agent.label}
                      </span>
                      <CheckCircle2
                        size={15}
                        className={`shrink-0 transition-all ${active ? 'text-indigo-500 opacity-100' : 'opacity-0'}`}
                      />
                    </button>
                  )
                })}

                {/* CEO — always on */}
                <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    CE
                  </div>
                  <span className="text-sm font-medium text-indigo-700 flex-1 truncate">CEO Orchestrator</span>
                  <span className="text-[10px] font-semibold text-indigo-400 shrink-0">always on</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* AI model card */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 space-y-5">
              <label className="text-sm font-semibold text-gray-800 block">AI model</label>

              {/* Provider tabs with coming-soon tooltip */}
              <div className="flex gap-2 flex-wrap">
                {providerIds.map(id => {
                  const p = PROVIDERS[id]
                  const isComingSoon = !!p.comingSoon
                  return (
                    <div key={id} className="relative group/tip">
                      <button
                        onClick={() => {
                          if (isComingSoon) return
                          setProvider(id)
                          setModel(p.defaultModel)
                          savePrefs(id, p.defaultModel)
                        }}
                        disabled={isComingSoon}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                          !isComingSoon && provider === id
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                            : isComingSoon
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p.label}
                      </button>
                      {isComingSoon && (
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-20">
                          Coming soon
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Model select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Model</label>
                {config.freeText ? (
                  <input
                    type="text"
                    value={model}
                    onChange={e => { setModel(e.target.value); savePrefs(provider, e.target.value) }}
                    placeholder="e.g. openai/gpt-4o"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  />
                ) : (
                  <select
                    value={model}
                    onChange={e => { setModel(e.target.value); savePrefs(provider, e.target.value) }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition appearance-none cursor-pointer"
                  >
                    {config.models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-400">Powered by our infrastructure — no API key needed.</p>
              </div>
            </div>

            {/* Run summary card */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Run summary</p>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-500">Active agents</span>
                  <span className="font-semibold text-gray-900">{selectedAgents.length + 1} / 6</span>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-500">Provider</span>
                  <span className="font-semibold text-gray-900">{PROVIDERS[provider].label}</span>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-500">Model</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[170px]">{model}</span>
                </div>
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-500">Idea</span>
                  <span className={`font-semibold flex items-center gap-1 ${idea.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                    {idea.trim() ? <><CheckCircle2 size={13} />entered</> : 'not yet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                upgradeRequired
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}>
                <p>{error}</p>
                {upgradeRequired && (
                  <a
                    href="/pricing"
                    className="mt-2 inline-block font-semibold underline underline-offset-2 hover:text-amber-900 transition-colors"
                  >
                    View plans &amp; upgrade →
                  </a>
                )}
                {activeSessionId && (
                  <button
                    onClick={() => router.push(`/dashboard/${activeSessionId}`)}
                    className="mt-2 font-semibold underline underline-offset-2 hover:text-red-800 transition-colors"
                  >
                    View active swarm →
                  </button>
                )}
              </div>
            )}

            {/* Launch */}
            <button
              onClick={handleLaunch}
              disabled={loading || !idea.trim()}
              className="w-full group flex items-center justify-center gap-3 rounded-2xl bg-gray-900 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-black hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Spinning up your swarm…
                </>
              ) : iterating ? (
                <>
                  <RefreshCw size={16} />
                  Re-launch Swarm
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              ) : (
                <>
                  <Rocket size={17} />
                  Launch Your Swarm
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              One sandbox per run · No API key needed
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LaunchPage() {
  return (
    <Suspense>
      <LaunchForm />
    </Suspense>
  )
}
