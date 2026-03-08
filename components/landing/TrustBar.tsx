'use client'

import { Diamond } from 'lucide-react'

const items = [
  'PRODUCT MANAGER',
  'BACKEND ENGINEER',
  'FRONTEND ENGINEER',
  'MARKETING & GROWTH',
  'CONTENT + PITCH',
  'CEO ORCHESTRATOR',
]

export default function LandingTrustBar() {
  const repeated = [...items, ...items, ...items, ...items]

  return (
    <section className="py-20 md:py-24 border-y border-gray-100 bg-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center relative z-10">
        <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">
          Your AI Founding Team
        </p>
      </div>

      <div className="relative flex overflow-hidden w-full">
        <div
          className="flex gap-10 md:gap-16 items-center whitespace-nowrap flex-nowrap w-max"
          style={{ animation: 'scrollLeft 80s linear infinite' }}
        >
          {repeated.map((item, i) => (
            <div key={i} className="flex items-center gap-10 md:gap-16">
              <span className="text-3xl sm:text-4xl md:text-5xl font-bold italic text-gray-200 hover:text-indigo-600 transition-colors duration-300 select-none cursor-pointer tracking-tight whitespace-nowrap">
                {item}
              </span>
              <Diamond size={18} className="text-indigo-200 opacity-50 shrink-0" />
            </div>
          ))}
        </div>

        <div className="absolute inset-y-0 left-0 w-24 md:w-64 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 md:w-64 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      </div>

      <style>{`
        @keyframes scrollLeft {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
