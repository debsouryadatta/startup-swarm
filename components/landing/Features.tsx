'use client'

import { Zap, Radio, KeyRound, RotateCcw, Download, ToggleLeft } from 'lucide-react'

const features = [
  {
    icon: Radio,
    title: 'Live Token Streaming',
    description: 'Watch each agent think in real time — token by token. No waiting for a spinner. You see every decision as it happens.',
  },
  {
    icon: Zap,
    title: 'True Parallel Execution',
    description: 'Three agents run simultaneously in Phase 2 using real OS-level parallelism. Not coroutines. Actual concurrent processes.',
  },
  {
    icon: KeyRound,
    title: 'Your Keys, Your Privacy',
    description: 'API keys are stored in your browser session only — never on our servers. You stay in full control of your LLM spend.',
  },
  {
    icon: RotateCcw,
    title: 'Per-Agent Iteration',
    description: "Not happy with the marketing plan? Re-run just that agent with feedback. Every other agent's output stays untouched.",
  },
  {
    icon: Download,
    title: 'Zip Download',
    description: 'When the swarm completes, all outputs are packaged into a shareable zip — PRD, architecture, code, pitch deck, GTM plan.',
  },
  {
    icon: ToggleLeft,
    title: 'Agent Toggles',
    description: 'Enable or disable any agent before launching. Only want technical output? Skip marketing. Your call.',
  },
]

export default function LandingFeatures() {
  return (
    <section id="features" className="py-20 sm:py-28 md:py-32 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-40">
        <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-indigo-100/50 rounded-full mix-blend-multiply blur-[120px]" />
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-purple-100/50 rounded-full mix-blend-multiply blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 relative z-10">

        {/* Header */}
        <div className="mb-12 sm:mb-16 md:mb-20 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gray-50 border border-gray-200 shadow-sm mb-5 sm:mb-6 text-xs sm:text-sm font-semibold text-gray-500">
            Why Startup Swarm
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
            Built where{' '}
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 pr-1">
              chat AI
            </span>{' '}
            hits a wall.
          </h2>
        </div>

        {/* Grid — 1 col mobile, 2 col tablet, 3 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="group relative h-full cursor-pointer">
                <div className="relative h-full p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-gray-200/80 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col hover:-translate-y-1">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-indigo-600 mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-indigo-50 transition-all duration-300 shrink-0">
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900 group-hover:text-indigo-900 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed text-sm sm:text-base">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
