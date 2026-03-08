'use client'

import { ArrowRight } from 'lucide-react'
import { useSession } from 'next-auth/react'

const mockAgents = [
  { label: 'Product Manager',  status: 'Done',    phase: '01', statusColor: 'bg-green-950/60 text-green-400' },
  { label: 'Backend Engineer', status: 'Working', phase: '02', statusColor: 'bg-blue-950/60 text-blue-400 animate-pulse' },
  { label: 'Mktg & Growth',    status: 'Working', phase: '02', statusColor: 'bg-blue-950/60 text-blue-400 animate-pulse' },
  { label: 'Content + Pitch',  status: 'Working', phase: '02', statusColor: 'bg-blue-950/60 text-blue-400 animate-pulse' },
  { label: 'Frontend Eng.',    status: 'Waiting', phase: '03', statusColor: 'bg-gray-800 text-gray-500' },
  { label: 'CEO Orchestrator', status: 'Working', phase: '04', statusColor: 'bg-purple-950/60 text-purple-400 animate-pulse' },
]

export default function LandingHero() {
  const { status } = useSession()
  const isAuthed = status === 'authenticated'

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center pt-20 sm:pt-28 pb-16 bg-[#FAFAFA]">
      {/* Background blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[100vw] h-[100vw] max-w-[800px] max-h-[800px] bg-indigo-100/40 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-purple-100/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6 flex flex-col items-center text-center w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 py-2 px-4 sm:px-5 rounded-full bg-white border border-gray-200/80 shadow-sm mb-7 sm:mb-10">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
          </span>
          <span className="text-xs font-semibold text-gray-600 tracking-wide">Now in Beta · Your AI Founding Team</span>
        </div>

        {/* Headline */}
        <h1 className="text-[2.4rem] sm:text-5xl md:text-6xl lg:text-[5.25rem] font-bold leading-[1.08] tracking-tight mb-5 sm:mb-8 text-gray-900 max-w-4xl">
          Type an idea.{' '}
          <span className="inline-block italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 pb-2 leading-[1.12]">
            Watch it build.
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-500 max-w-xl sm:max-w-2xl mb-8 sm:mb-12 leading-relaxed px-1 sm:px-0">
          Six specialized AI agents work in parallel inside a live sandbox.{' '}
          <span className="font-semibold text-gray-900">Your full startup kit, in minutes.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 justify-center w-full max-w-sm sm:max-w-none">
          <a
            href={isAuthed ? '/launch' : '#launch'}
            className="px-7 py-4 bg-gray-900 text-white font-semibold text-base sm:text-lg rounded-2xl transition-all hover:bg-black hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {isAuthed ? 'Go to Dashboard' : 'Launch Your Swarm'} <ArrowRight size={18} />
          </a>
          <a
            href="#how-it-works"
            className="px-7 py-4 bg-white/60 backdrop-blur-sm border border-gray-200 text-gray-900 font-semibold text-base sm:text-lg rounded-2xl hover:bg-white hover:border-gray-300 transition-all text-center hover:-translate-y-0.5 hover:shadow-sm"
          >
            See How It Works
          </a>
        </div>

        {/* Dashboard mockup — desktop: browser chrome + full grid, mobile: compact agent grid */}
        <div className="relative mt-12 sm:mt-16 w-full max-w-5xl mx-auto">

          {/* Desktop: browser chrome + 3-col grid */}
          <div className="hidden sm:block">
            <div className="relative rounded-t-[2rem] overflow-hidden border-t border-x border-gray-200/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]">
              <div className="h-10 sm:h-12 border-b border-gray-200/80 bg-gray-50 flex items-center px-4 sm:px-6 gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="ml-4 flex-1 h-5 bg-gray-200/60 rounded-full max-w-xs" />
              </div>
              <div className="w-full bg-[#0c0c0e] p-4 sm:p-6 grid grid-cols-3 gap-3 sm:gap-4 min-h-[220px] sm:min-h-[280px]">
                {mockAgents.map((agent) => (
                  <div key={agent.label} className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] sm:text-xs font-semibold text-slate-300 truncate">{agent.label}</span>
                      <span className={`text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${agent.statusColor}`}>
                        {agent.status}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[0.9, 0.7, 0.5].map((w, i) => (
                        <div key={i} className="h-1.5 rounded-full bg-white/5" style={{ width: `${w * 100}%` }} />
                      ))}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-slate-600 font-mono">Phase {agent.phase}</div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] via-transparent to-transparent opacity-70 pointer-events-none" />
            </div>
          </div>

          {/* Mobile: compact 2×3 agent grid, no browser chrome */}
          <div className="sm:hidden rounded-2xl overflow-hidden border border-gray-200/60 shadow-xl">
            <div className="bg-[#0c0c0e] p-3 grid grid-cols-2 gap-2.5">
              {mockAgents.map((agent) => (
                <div key={agent.label} className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[11px] font-semibold text-slate-300 leading-tight">{agent.label}</span>
                  </div>
                  <span className={`self-start text-[9px] font-mono px-1.5 py-0.5 rounded-full ${agent.statusColor}`}>
                    {agent.status}
                  </span>
                  <div className="space-y-1">
                    {[0.85, 0.6].map((w, i) => (
                      <div key={i} className="h-1 rounded-full bg-white/5" style={{ width: `${w * 100}%` }} />
                    ))}
                  </div>
                  <div className="text-[9px] text-slate-700 font-mono">Phase {agent.phase}</div>
                </div>
              ))}
            </div>
            <div className="bg-[#0c0c0e] px-3 pb-3">
              <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-[58%] bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full" />
              </div>
              <p className="text-[10px] text-slate-600 font-mono mt-1.5 text-right">58% complete</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
