'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket, Clock, Download, CheckCircle2, AlertCircle, XCircle, Loader2, ArrowRight, Sparkles, RefreshCw, IterationCw } from 'lucide-react'

interface Session {
  id:             string
  status:         string
  idea:           string
  llmProvider:    string
  llmModel:       string
  selectedAgents?: string[]
  downloadUrl:    string | null
  createdAt:      string | null
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  const diff = Date.now() - new Date(dateStr).getTime()
  const min  = Math.floor(diff / 60_000)
  const hr   = Math.floor(min / 60)
  const day  = Math.floor(hr / 24)
  if (min < 1)  return 'Just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24)  return `${hr}h ago`
  if (day < 30) return `${day}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; dot: string }> = {
  complete:  { label: 'Complete',  color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle2, dot: 'bg-green-500'  },
  running:   { label: 'Running',   color: 'bg-blue-100  text-blue-700  border-blue-200',   icon: Loader2,      dot: 'bg-blue-500'   },
  spawning:  { label: 'Spawning',  color: 'bg-blue-100  text-blue-700  border-blue-200',   icon: Loader2,      dot: 'bg-blue-500'   },
  error:     { label: 'Error',     color: 'bg-red-100   text-red-700   border-red-200',    icon: AlertCircle,  dot: 'bg-red-500'    },
  cancelled: { label: 'Cancelled', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: XCircle,      dot: 'bg-amber-500'  },
  expired:   { label: 'Expired',   color: 'bg-gray-100  text-gray-500  border-gray-200',   icon: Clock,        dot: 'bg-gray-400'   },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired
  const Icon = cfg.icon
  const isAnimated = status === 'running' || status === 'spawning'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
      <Icon size={11} className={isAnimated ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  )
}

function SessionCard({ session, onClick, onIterate }: { session: Session; onClick: () => void; onIterate: () => void }) {
  const isActive   = session.status === 'running' || session.status === 'spawning'
  const canIterate = ['complete', 'error', 'cancelled', 'expired'].includes(session.status)

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer overflow-hidden"
    >
      {/* Active indicator strip */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 animate-pulse" />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <StatusBadge status={session.status} />
          <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(session.createdAt)}</span>
        </div>

        {/* Idea */}
        <p className="text-sm font-medium text-gray-900 leading-relaxed line-clamp-2 mb-4">
          {session.idea}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1">
            <span className="font-medium text-gray-600">{session.llmProvider}</span>
            <span className="text-gray-300">·</span>
            <span className="truncate max-w-[120px]">{session.llmModel}</span>
          </span>
          <span className="text-xs text-gray-300 font-mono truncate max-w-[100px]">{session.id.slice(0, 8)}…</span>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {session.downloadUrl && (
            <a
              href={session.downloadUrl}
              download
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors shrink-0"
            >
              <Download size={12} />
              Download Kit
            </a>
          )}
          {canIterate && (
            <button
              onClick={e => { e.stopPropagation(); onIterate() }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
              title="Re-launch with this idea pre-filled"
            >
              <IterationCw size={12} />
              Iterate
            </button>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-indigo-600 transition-colors shrink-0">
          View results
          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const [sessions,  setSessions]  = useState<Session[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const handleIterate = (session: Session) => {
    const params = new URLSearchParams()
    params.set('idea', session.idea)
    params.set('provider', session.llmProvider)
    params.set('model', session.llmModel)
    if (session.selectedAgents && session.selectedAgents.length > 0) {
      const withoutCeo = session.selectedAgents.filter(a => a !== 'ceoOrchestrator')
      if (withoutCeo.length > 0) params.set('agents', withoutCeo.join(','))
    }
    router.push(`/launch?${params.toString()}`)
  }

  const fetchSessions = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res  = await fetch('/api/sessions')
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load sessions'); return }
      setSessions(data.sessions ?? [])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchSessions() }, [])

  // Auto-refresh every 8s if there are active sessions
  useEffect(() => {
    const hasActive = sessions.some(s => s.status === 'running' || s.status === 'spawning')
    if (!hasActive) return
    const timer = setInterval(() => fetchSessions(true), 8_000)
    return () => clearInterval(timer)
  }, [sessions])

  if (loading) {
    return (
      <div className="min-h-full bg-[#fafafa] flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading your swarms…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#fafafa] text-gray-900">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-indigo-50/60 blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
              Previous Swarms
            </h1>
            <p className="text-gray-400 text-base">
              {sessions.length === 0
                ? 'No swarms yet.'
                : `${sessions.length} swarm${sessions.length > 1 ? 's' : ''} — click any to view results.`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <button
              onClick={() => fetchSessions(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => router.push('/launch')}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black shadow-sm transition-all hover:-translate-y-0.5"
            >
              <Rocket size={14} />
              New Swarm
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 border border-indigo-100">
              <Sparkles size={32} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">No swarms yet</h2>
            <p className="text-gray-400 text-sm max-w-sm mb-8 leading-relaxed">
              Your AI founding team is ready. Launch your first swarm to build an entire startup kit from a single idea.
            </p>
            <button
              onClick={() => router.push('/launch')}
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 hover:-translate-y-0.5 transition-all"
            >
              <Rocket size={15} />
              Launch your first swarm
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Sessions grid */}
        {sessions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => router.push(`/dashboard/${session.id}`)}
                onIterate={() => handleIterate(session)}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        {sessions.length > 0 && (
          <p className="mt-8 text-center text-xs text-gray-300">
            Sessions are stored for 45 minutes · Completed kits are available for download
          </p>
        )}
      </div>
    </div>
  )
}
