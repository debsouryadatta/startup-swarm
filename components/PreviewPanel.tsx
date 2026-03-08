'use client'

import { useState } from 'react'
import { X, Copy, Check, ChevronRight, Layers, Trophy, Clock } from 'lucide-react'
import { AgentState } from './AgentCard'
import { AGENT_CONFIGS } from './AgentGrid'
import type { LucideIcon } from 'lucide-react'

type PreviewConfig = {
  key:         string
  name:        string
  label:       string
  icon:        LucideIcon
  description: string
  phase:       number
  color:       'blue' | 'green' | 'purple'
}

const ALL_PREVIEW_AGENTS: PreviewConfig[] = [
  ...AGENT_CONFIGS.map(c => ({ ...c, key: c.name })),
  {
    key:         'ceoOrchestrator_4',
    name:        'ceoOrchestrator_4',
    label:       'CEO Final Synthesis',
    icon:        Trophy,
    description: 'Complete startup kit synthesis · Final recommendations',
    phase:       4,
    color:       'purple' as const,
  },
]

const colorMap = {
  purple: { iconBg: 'bg-violet-50 border-violet-100', iconText: 'text-violet-500', dot: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  blue:   { iconBg: 'bg-blue-50 border-blue-100',     iconText: 'text-blue-500',   dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 border-blue-200'     },
  green:  { iconBg: 'bg-emerald-50 border-emerald-100', iconText: 'text-emerald-500', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

interface Props {
  agentStates: Record<string, AgentState>
  initialKey?: string
  onClose:     () => void
}

// ─── Render a single output value ────────────────────────────────────────────
function SectionContent({ value }: { value: unknown }) {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
    const headers = Object.keys(value[0] as Record<string, unknown>)
    return (
      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {headers.map(h => (
                <th key={h} className="text-left py-2 pr-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {h.replace(/([A-Z])/g, ' $1').trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(value as Record<string, unknown>[]).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                {headers.map(h => (
                  <td key={h} className="py-2.5 pr-5 text-gray-700 align-top leading-relaxed text-sm">
                    {String(row[h] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (Array.isArray(value)) {
    return (
      <ul className="space-y-2">
        {(value as string[]).map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
            <span className="text-sm text-gray-700 leading-relaxed">{String(item)}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'string' && value.length > 80) {
    return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{value}</p>
  }

  return <p className="text-sm font-semibold text-gray-900">{String(value ?? '')}</p>
}

// ─── Single agent's full output ──────────────────────────────────────────────
function AgentOutputView({ config, state }: { config: PreviewConfig; state: AgentState }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const cm      = colorMap[config.color] ?? colorMap.blue
  const Icon    = config.icon
  const entries = Object.entries(state.output ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '')

  const copySection = (key: string, value: unknown) => {
    navigator.clipboard.writeText(Array.isArray(value) ? JSON.stringify(value, null, 2) : String(value))
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const copyAll = () => {
    const text = entries.map(([k, v]) =>
      `## ${k}\n${Array.isArray(v) ? JSON.stringify(v, null, 2) : String(v)}`
    ).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-3">
      {/* Agent header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border shrink-0 ${cm.iconBg}`}>
              <Icon size={20} className={cm.iconText} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className="font-bold text-gray-900 text-base leading-tight">{config.label}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cm.badge}`}>
                  Phase {config.phase}
                </span>
              </div>
              <p className="text-xs text-gray-400">{config.description}</p>
            </div>
          </div>
          <button
            onClick={copyAll}
            className="shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:bg-white transition-colors flex items-center gap-1.5"
          >
            {copiedAll
              ? <><Check size={11} className="text-green-500" /> Copied!</>
              : <><Copy size={11} /> Copy all</>}
          </button>
        </div>
      </div>

      {/* Output sections */}
      {entries.map(([key, value]) => (
        <section key={key} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${cm.dot}`} />
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
              </h4>
            </div>
            <button
              onClick={() => copySection(key, value)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
            >
              {copiedKey === key
                ? <><Check size={10} className="text-green-500" /> <span className="text-green-600">Copied</span></>
                : <><Copy size={10} /> Copy</>}
            </button>
          </div>
          <div className="px-4 py-4">
            <SectionContent value={value} />
          </div>
        </section>
      ))}

      {entries.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-400 text-sm">No output data available for this agent.</p>
        </div>
      )}
    </div>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────
export function PreviewPanel({ agentStates, initialKey, onClose }: Props) {
  const doneAgents = ALL_PREVIEW_AGENTS.filter(a => {
    const s = agentStates[a.key]
    return s?.status === 'done' && s?.output
  })

  const startKey = initialKey && doneAgents.find(a => a.key === initialKey)
    ? initialKey
    : (doneAgents[0]?.key ?? '')

  const [selectedKey, setSelectedKey] = useState(startKey)

  const activeConfig = doneAgents.find(a => a.key === selectedKey) ?? doneAgents[0]
  const activeState  = activeConfig ? agentStates[activeConfig.key] : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 animate-in fade-in duration-150">

      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shadow-indigo-200">
            <Layers size={14} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm leading-none">Startup Kit</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {doneAgents.length} of {ALL_PREVIEW_AGENTS.length} agents complete
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close preview"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — desktop */}
        <nav className="hidden md:flex flex-col w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <p className="px-4 pt-4 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Agents</p>
          {ALL_PREVIEW_AGENTS.map(agent => {
            const s        = agentStates[agent.key]
            const isDone   = s?.status === 'done' && s?.output
            const isActive = selectedKey === agent.key
            const cm       = colorMap[agent.color] ?? colorMap.blue
            const Icon     = agent.icon
            return (
              <button
                key={agent.key}
                onClick={() => isDone && setSelectedKey(agent.key)}
                disabled={!isDone}
                className={[
                  'flex items-center gap-2.5 mx-2 mb-0.5 rounded-xl px-3 py-2 text-left transition-all',
                  isActive              ? 'bg-indigo-50 shadow-sm'                                  : '',
                  isDone && !isActive   ? 'hover:bg-gray-50'                                        : '',
                  !isDone               ? 'opacity-40 cursor-not-allowed'                           : 'cursor-pointer',
                ].join(' ')}
              >
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${cm.iconBg}`}>
                  <Icon size={13} className={cm.iconText} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate leading-tight ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {agent.label}
                  </p>
                  <p className={`text-[10px] mt-0.5 font-medium flex items-center gap-0.5 ${isDone ? 'text-green-500' : 'text-gray-300'}`}>
                    {isDone ? <><Check size={9} strokeWidth={3} /> Done</> : 'Pending'}
                  </p>
                </div>
                {isActive && <ChevronRight size={12} className="text-indigo-400 shrink-0" />}
              </button>
            )
          })}
        </nav>

        {/* Right content area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Mobile tab bar */}
          <div className="md:hidden flex overflow-x-auto border-b border-gray-200 bg-white shrink-0 scrollbar-none">
            {doneAgents.map(agent => {
              const Icon = agent.icon
              return (
                <button
                  key={agent.key}
                  onClick={() => setSelectedKey(agent.key)}
                  className={[
                    'flex shrink-0 items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors',
                    selectedKey === agent.key
                      ? 'border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-400 hover:text-gray-700',
                  ].join(' ')}
                >
                  <Icon size={12} />
                  {agent.label}
                </button>
              )
            })}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {activeConfig && activeState ? (
              <AgentOutputView config={activeConfig} state={activeState} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Clock size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm font-medium">No outputs yet</p>
                <p className="text-gray-400 text-xs mt-1">Agents are still running…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
