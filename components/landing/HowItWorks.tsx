'use client'

const phases = [
  {
    number: '00',
    title: 'CEO Initializes',
    description:
      'The CEO Orchestrator reads your idea, sets the global context, and briefs the entire swarm before any agent starts working.',
  },
  {
    number: '01',
    title: 'PM Strategizes',
    description:
      'The Product Manager runs first — writing the PRD, user stories, feature roadmap, and success metrics. Every other agent depends on this output.',
  },
  {
    number: '02',
    title: 'Team Executes in Parallel',
    description:
      'Backend Engineer, Marketing & Growth, and Content + Pitch all run simultaneously — three agents generating output at the same time, not one by one.',
  },
  {
    number: '03',
    title: 'Frontend Completes',
    description:
      "The Frontend Engineer reads the Backend's API contracts and the PM's design spec to produce UI components, page structure, and the complete design system.",
  },
  {
    number: '04',
    title: 'CEO Synthesizes',
    description:
      "The CEO Orchestrator reads every agent's output, spots gaps, and writes the final synthesized startup kit — ready for you to download.",
  },
]

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 md:py-32 bg-white text-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[20%] right-[10%] w-[50%] h-[50%] bg-indigo-100/60 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-sky-100/60 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 relative z-10">

        {/* Header */}
        <div className="mb-12 sm:mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gray-50 border border-gray-200 mb-6 sm:mb-8 text-xs sm:text-sm font-semibold tracking-wide text-gray-600 uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              The Execution Model
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1]">
              A DAG, not a{' '}
              <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 pr-1">
                queue.
              </span>
            </h2>
          </div>
          <p className="text-gray-500 text-base sm:text-lg md:text-xl max-w-sm md:text-right leading-relaxed">
            Agents that can run in parallel do. No artificial bottlenecks. You watch three agents think simultaneously.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 lg:gap-x-12 gap-y-5 sm:gap-y-8 md:gap-y-16 relative">
          <div className="absolute left-[50%] top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent hidden md:block" />

          {phases.map((phase, index) => (
            <div
              key={phase.number}
              className={`relative group cursor-pointer ${index % 2 !== 0 ? 'md:mt-24' : ''}`}
            >
              <div className="relative p-6 sm:p-8 md:p-10 lg:p-12 rounded-2xl sm:rounded-3xl bg-white border border-gray-200/80 hover:border-indigo-200 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1">
                <div className="absolute -top-6 -right-6 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none">
                  <div className="text-7xl sm:text-9xl font-black text-indigo-600">{phase.number}</div>
                </div>

                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 flex flex-col items-start gap-4 sm:gap-6">
                  <div className="flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-mono text-lg sm:text-xl group-hover:bg-indigo-100 transition-all duration-500 shrink-0">
                    {phase.number}
                  </div>
                  {phase.title}
                </h3>
                <p className="text-gray-500 text-base sm:text-lg leading-relaxed relative z-10">{phase.description}</p>

                <div className="mt-8 sm:mt-12 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-[1200ms] ease-out w-0 group-hover:w-full"
                    style={{ transitionDelay: `${index * 100}ms` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {phases.length % 2 !== 0 && <div className="hidden md:block" />}
        </div>
      </div>
    </section>
  )
}
