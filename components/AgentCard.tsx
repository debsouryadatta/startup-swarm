'use client'

import { useEffect, useRef } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AgentStatus = 'idle' | 'waiting' | 'working' | 'done' | 'error'

export interface AgentConfig {
  name:        string
  label:       string
  icon:        LucideIcon
  description: string
  phase:       number
  color:       'blue' | 'green' | 'purple'
}

export interface AgentState {
  status: AgentStatus
  tokens: string
  output: Record<string, unknown> | null
  phase:  number
}

interface Props {
  config:      AgentConfig
  state:       AgentState
  onSelect?:   () => void
  isSelected?: boolean
}

const colorMap = {
  blue:   { iconBg: 'bg-blue-50',    iconText: 'text-blue-500'    },
  green:  { iconBg: 'bg-emerald-50', iconText: 'text-emerald-500' },
  purple: { iconBg: 'bg-violet-50',  iconText: 'text-violet-500'  },
}

const statusConfig: Record<AgentStatus, { card: string; badge: string; label: string }> = {
  idle:    { card: 'border-gray-200 bg-white',               badge: 'bg-gray-100 text-gray-400',                        label: 'Idle'    },
  waiting: { card: 'border-gray-200 bg-gray-50/60',          badge: 'bg-amber-50 text-amber-600 border border-amber-200', label: 'Queued'  },
  working: { card: 'border-blue-200 bg-blue-50/30',          badge: 'bg-blue-100 text-blue-600',                        label: 'Working' },
  done:    { card: 'border-green-200 bg-white',              badge: 'bg-green-50 text-green-600 border border-green-200', label: 'Done'    },
  error:   { card: 'border-red-200 bg-red-50/40',            badge: 'bg-red-50 text-red-600 border border-red-200',     label: 'Error'   },
}

export function AgentCard({ config, state, onSelect, isSelected }: Props) {
  const tokenScrollRef = useRef<HTMLDivElement>(null)
  const Icon    = config.icon
  const colors  = colorMap[config.color]
  const sc      = statusConfig[state.status]
  const isClickable = state.status === 'done'

  useEffect(() => {
    if (tokenScrollRef.current) {
      tokenScrollRef.current.scrollTop = tokenScrollRef.current.scrollHeight
    }
  }, [state.tokens])

  return (
    <div
      onClick={isClickable ? onSelect : undefined}
      className={[
        'rounded-xl border p-4 transition-all duration-200 group',
        sc.card,
        isClickable ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5' : '',
        isSelected  ? 'ring-2 ring-indigo-400 ring-offset-1 border-indigo-300' : '',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors.iconBg}`}>
            <Icon size={15} className={colors.iconText} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{config.label}</p>
            <p className="text-gray-400 text-xs mt-0.5 leading-tight">{config.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {state.status === 'working' && (
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          )}
          {state.status === 'done' && (
            <Check size={11} strokeWidth={3} className="text-green-500" />
          )}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sc.badge}`}>
            {sc.label}
          </span>
        </div>
      </div>

      {/* Live token stream */}
      {state.status === 'working' && state.tokens && (
        <div
          ref={tokenScrollRef}
          className="mt-3 max-h-16 overflow-y-auto rounded-lg bg-blue-950/5 border border-blue-100 px-3 py-2 font-mono text-[11px] leading-relaxed text-blue-700"
        >
          {state.tokens}
          <span className="inline-block h-3 w-0.5 animate-pulse bg-blue-500 ml-0.5 align-middle" />
        </div>
      )}

      {/* Done footer */}
      {state.status === 'done' && (
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {state.output
              ? `${Object.keys(state.output).length} fields`
              : state.tokens ? 'Raw output' : 'No output'}
          </span>
          <span className={`text-xs font-medium flex items-center gap-1 transition-colors ${
            isSelected ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500'
          }`}>
            {isSelected ? 'Viewing' : 'View output'}
            <ArrowRight size={10} />
          </span>
        </div>
      )}

      {/* Error */}
      {state.status === 'error' && (
        <p className="mt-2.5 text-xs text-red-500">Agent failed — run may still continue.</p>
      )}
    </div>
  )
}
