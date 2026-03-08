'use client'

import { Crown, ClipboardList, Settings2, Megaphone, Film, Monitor, Check, Circle, Zap } from 'lucide-react'
import { AgentCard, AgentConfig, AgentState } from './AgentCard'

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    name:        'ceoOrchestrator',
    label:       'CEO Orchestrator',
    icon:        Crown,
    description: 'Sets context · Final synthesis',
    phase:       0,
    color:       'purple',
  },
  {
    name:        'productManager',
    label:       'Product Manager',
    icon:        ClipboardList,
    description: 'PRD · User stories · Roadmap',
    phase:       1,
    color:       'green',
  },
  {
    name:        'backendEngineer',
    label:       'Backend Engineer',
    icon:        Settings2,
    description: 'DB schema · API routes · Tech stack',
    phase:       2,
    color:       'blue',
  },
  {
    name:        'marketingGrowth',
    label:       'Marketing & Growth',
    icon:        Megaphone,
    description: 'GTM · Personas · Social content',
    phase:       2,
    color:       'green',
  },
  {
    name:        'contentPitch',
    label:       'Content + Pitch',
    icon:        Film,
    description: 'Pitch deck · One-pager · Reels script',
    phase:       2,
    color:       'purple',
  },
  {
    name:        'frontendEngineer',
    label:       'Frontend Engineer',
    icon:        Monitor,
    description: 'Pages · Components · Design system',
    phase:       3,
    color:       'blue',
  },
]

export const DEFAULT_AGENT_STATE: AgentState = {
  status: 'idle',
  tokens: '',
  output: null,
  phase:  0,
}

interface Props {
  agentStates: Record<string, AgentState>
  activePhase: number
  selectedKey: string | null
  onSelect:    (key: string) => void
}

const phaseStyles = {
  pending: {
    wrap:      'border-gray-200 bg-white',
    numBg:     'bg-gray-100 text-gray-400',
    label:     'text-gray-400',
    sublabel:  'text-gray-400',
    indicator: 'text-gray-300 border-gray-200 bg-gray-50',
  },
  active: {
    wrap:      'border-blue-200 bg-blue-50/20',
    numBg:     'bg-blue-100 text-blue-700',
    label:     'text-blue-700',
    sublabel:  'text-gray-500',
    indicator: 'text-blue-600 border-blue-200 bg-blue-50',
  },
  done: {
    wrap:      'border-green-200 bg-white',
    numBg:     'bg-green-100 text-green-700',
    label:     'text-green-700',
    sublabel:  'text-gray-500',
    indicator: 'text-green-600 border-green-200 bg-green-50',
  },
}

export function AgentGrid({ agentStates, activePhase, selectedKey, onSelect }: Props) {
  const phases = [
    { phase: 0, num: '0', sublabel: 'Initialization',   agents: AGENT_CONFIGS.filter(a => a.phase === 0) },
    { phase: 1, num: '1', sublabel: 'Product Planning', agents: AGENT_CONFIGS.filter(a => a.phase === 1) },
    { phase: 2, num: '2', sublabel: 'Parallel Sprint',  agents: AGENT_CONFIGS.filter(a => a.phase === 2) },
    { phase: 3, num: '3', sublabel: 'Frontend',         agents: AGENT_CONFIGS.filter(a => a.phase === 3) },
    { phase: 4, num: '4', sublabel: 'Final Synthesis',  agents: [AGENT_CONFIGS[0]] },
  ]

  const getStatus = (phase: number): 'pending' | 'active' | 'done' => {
    if (activePhase > phase)   return 'done'
    if (activePhase === phase) return 'active'
    return 'pending'
  }

  return (
    <div className="space-y-3">
      {phases.map(row => {
        const status = getStatus(row.phase)
        const s      = phaseStyles[status]

        return (
          <div key={row.phase} className={`rounded-2xl border overflow-hidden ${s.wrap}`}>
            {/* Phase header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100/80">
              <div className="flex items-center gap-2.5">
                <span className={`text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${s.numBg}`}>
                  {row.num}
                </span>
                <span className={`text-xs font-semibold ${s.label}`}>Phase {row.num}</span>
                <span className="text-gray-300 text-xs">·</span>
                <span className={`text-xs ${s.sublabel}`}>{row.sublabel}</span>
                {status === 'active' && row.agents.length > 1 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-blue-500 font-medium ml-0.5">
                    <Zap size={10} className="fill-blue-500" />
                    Parallel
                  </span>
                )}
              </div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full border px-2 py-0.5 ${s.indicator}`}>
                {status === 'done'
                  ? <><Check size={10} strokeWidth={3} /> Done</>
                  : status === 'active'
                  ? <><Circle size={7} className="fill-current" /> Active</>
                  : <><Circle size={7} /> Waiting</>}
              </span>
            </div>

            {/* Agent cards */}
            <div className={`p-3 grid gap-3 ${row.agents.length > 1 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 max-w-sm'}`}>
              {row.agents.map(config => {
                const stateKey = row.phase === 4 ? 'ceoOrchestrator_4' : config.name
                const state    = agentStates[stateKey] ?? DEFAULT_AGENT_STATE
                return (
                  <AgentCard
                    key={`${config.name}-${row.phase}`}
                    config={config}
                    state={state}
                    onSelect={() => onSelect(stateKey)}
                    isSelected={selectedKey === stateKey}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
