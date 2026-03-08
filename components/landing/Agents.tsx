'use client'

import { ArrowRight, Code2, Cpu, Megaphone, FileText, Crown, LayoutDashboard } from 'lucide-react'

const agents = [
  {
    icon: Crown,
    title: 'CEO Orchestrator',
    description: 'Runs throughout the entire session — synthesizes all outputs, spots gaps, and delivers your final startup kit.',
    phase: 'Phase 00 + 04',
    color: 'purple',
  },
  {
    icon: Cpu,
    title: 'Product Manager',
    description: 'Writes the PRD, user stories, feature roadmap, and success metrics. The foundation every other agent builds on.',
    phase: 'Phase 01',
    color: 'blue',
  },
  {
    icon: Code2,
    title: 'Backend Engineer',
    description: "Designs the database schema, API routes, data models, and backend architecture based on the PM's spec.",
    phase: 'Phase 02',
    color: 'blue',
  },
  {
    icon: Megaphone,
    title: 'Marketing & Growth',
    description: 'Drafts the go-to-market plan, social content strategy, and growth campaigns — runs in parallel with Backend.',
    phase: 'Phase 02',
    color: 'green',
  },
  {
    icon: FileText,
    title: 'Content + Pitch',
    description: 'Writes the pitch deck outline, investor one-pager, demo script, and launch content — simultaneously with backend.',
    phase: 'Phase 02',
    color: 'purple',
  },
  {
    icon: LayoutDashboard,
    title: 'Frontend Engineer',
    description: 'Builds UI components, page structure, and design system from the PM spec and Backend API contracts.',
    phase: 'Phase 03',
    color: 'blue',
  },
]

const colorMap: Record<string, { bg: string; icon: string; badge: string }> = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   badge: 'bg-blue-50 text-blue-600 border-blue-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  badge: 'bg-green-50 text-green-600 border-green-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', badge: 'bg-purple-50 text-purple-600 border-purple-100' },
}

export default function LandingAgents() {
  return (
    <section id="agents" className="py-20 sm:py-28 md:py-32 bg-[#FAFAFA] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-40">
        <div className="absolute top-20 right-20 w-[600px] h-[600px] bg-indigo-200/40 rounded-full mix-blend-multiply blur-[120px]" />
        <div className="absolute bottom-20 left-20 w-[600px] h-[600px] bg-sky-200/40 rounded-full mix-blend-multiply blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 relative z-10">

        {/* Header */}
        <div className="mb-12 sm:mb-16 md:mb-20 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-5 sm:mb-6 text-xs sm:text-sm font-semibold text-gray-500">
            The Swarm
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
            Six agents. One{' '}
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 pr-1">
              coordinated
            </span>{' '}
            team.
          </h2>
        </div>

        {/* Grid — 1 col mobile, 2 col tablet, 3 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-8">
          {agents.map((agent, index) => {
            const Icon = agent.icon
            const c = colorMap[agent.color]
            return (
              <div
                key={agent.title}
                className="group relative h-full cursor-pointer"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="relative h-full p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-gray-200/80 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
                  <div>
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${c.bg} border border-gray-100 flex items-center justify-center ${c.icon} mb-5 sm:mb-6 group-hover:scale-110 transition-all duration-300`}>
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-semibold mb-3 sm:mb-4 ${c.badge}`}>
                      {agent.phase}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900 group-hover:text-indigo-900 transition-colors">
                      {agent.title}
                    </h3>
                    <p className="text-gray-500 leading-relaxed text-sm sm:text-[1.05rem]">{agent.description}</p>
                  </div>
                  <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-50 flex items-center gap-2 text-sm font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    View outputs <ArrowRight size={15} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
