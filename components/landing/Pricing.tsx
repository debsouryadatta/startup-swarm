'use client'

import { Check } from 'lucide-react'
import { useSession } from 'next-auth/react'

const plans = [
  {
    name: 'Hobby',
    price: 'Free',
    period: '',
    description: 'Try the swarm. No card needed.',
    highlight: false,
    cta: 'Get started free',
    ctaHref: '/signup',
    badge: null,
    features: [
      '3 swarm runs (one-time)',
      'GPT-4o model',
      'All 6 AI agents',
      'Zip download of output',
      'Community support',
    ],
  },
  {
    name: 'Builder',
    price: '₹999',
    period: '/month',
    description: 'For founders moving fast.',
    highlight: true,
    cta: 'Get Builder plan',
    ctaHref: '/pricing',
    badge: 'Most Popular',
    features: [
      '30 swarm runs / month',
      'All OpenAI models (GPT-4.1, o3…)',
      'All 6 AI agents',
      'Zip download of output',
      'Priority sandbox queue',
      'Email support',
    ],
  },
  {
    name: 'Studio',
    price: '₹2,999',
    period: '/month',
    description: 'For teams shipping continuously.',
    highlight: false,
    cta: 'Get Studio plan',
    ctaHref: '/pricing',
    badge: null,
    features: [
      'Unlimited swarm runs',
      'All models incl. future providers',
      'All 6 AI agents + custom agents soon',
      'Zip download of output',
      'Dedicated sandbox queue',
      'Priority support + early access',
    ],
  },
]

export default function LandingPricing() {
  const { status } = useSession()
  const isAuthed = status === 'authenticated'

  return (
    <section id="pricing" className="py-32 bg-white border-t border-gray-200/50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold tracking-wide uppercase mb-5">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-5">
            Simple, honest pricing.
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            We cover the AI and sandbox costs. You just pay for what you use.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 items-center">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-8 transition-all ${
                plan.highlight
                  ? 'bg-white border-indigo-200 shadow-2xl shadow-indigo-500/10 scale-[1.03] z-10'
                  : 'bg-[#fafafa] border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg shadow-indigo-500/30">
                  {plan.badge}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-400 mb-5">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-400 text-sm">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-3.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <Check size={11} strokeWidth={3} className="text-indigo-600" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={plan.name === 'Hobby' && isAuthed ? '/launch' : plan.ctaHref}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all ${
                  plan.highlight
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                    : 'bg-white border border-gray-200 text-gray-900 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {plan.name === 'Hobby' && isAuthed ? 'Go to Dashboard' : plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="flex flex-col items-center gap-3 mt-12">
          <p className="text-center text-xs text-gray-400">
            All plans include our cloud AI infrastructure. No hidden API costs — we handle everything.
          </p>
          <a
            href="/pricing"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors inline-flex items-center gap-1 group"
          >
            See full pricing details
            <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
