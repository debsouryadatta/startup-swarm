'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    question: 'What exactly do I get at the end?',
    answer:
      'A zip file containing: a full Product Requirements Doc, a technical architecture (DB schema + API routes), UI component spec + design system outline, a go-to-market plan, a pitch deck outline, an investor one-pager, and a CEO-level synthesis summary. All generated specifically for your idea.',
  },
  {
    question: 'Do you store or log my API key?',
    answer:
      "No. Your API key is stored only in your browser's session storage and passed directly to the sandbox environment. It never touches our database and is wiped when you close the tab.",
  },
  {
    question: 'How long does a full swarm run take?',
    answer:
      'Usually 3–8 minutes depending on your LLM provider, the model you choose, and how many agents are enabled. Phase 2 parallelism significantly cuts down total time — three agents running at once instead of sequentially.',
  },
  {
    question: 'Can I re-run one agent without redoing the whole swarm?',
    answer:
      'Yes. After a run completes, every agent card has an "Improve" button. You provide feedback and only that one agent re-runs — everything else stays as is. The re-run agent reads all the original context plus your feedback.',
  },
  {
    question: 'Which LLM providers are supported?',
    answer:
      'OpenAI (gpt-4o, gpt-4o-mini, o1-mini, o3-mini), Anthropic (claude-3-5-sonnet, claude-3-haiku, claude-3-opus), and OpenRouter (any model they list). You bring your own API key for whichever provider you prefer.',
  },
  {
    question: 'Is the CEO Orchestrator required?',
    answer:
      'Yes — the CEO Orchestrator is always on. It initializes the swarm context in Phase 0 and synthesizes the final output in Phase 4. All other agents are optional and can be toggled before launching.',
  },
]

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 sm:py-28 md:py-32 bg-white">
      <div className="max-w-3xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-200 mb-5 text-xs sm:text-sm font-semibold text-gray-500">
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">Common Questions</h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border rounded-xl sm:rounded-2xl bg-white overflow-hidden transition-all duration-200 cursor-pointer ${
                openIndex === index ? 'border-indigo-200 shadow-sm' : 'border-gray-200 hover:border-indigo-200'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 text-left gap-4"
              >
                <span className="font-semibold text-gray-900 text-sm sm:text-base leading-snug">{faq.question}</span>
                <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 text-gray-400">
                  {openIndex === index
                    ? <Minus size={14} className="text-indigo-600" />
                    : <Plus size={14} />}
                </span>
              </button>

              {openIndex === index && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-5 text-gray-500 text-sm sm:text-base leading-relaxed border-t border-gray-100 pt-4">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
