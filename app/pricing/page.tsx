'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import {
  Check, ArrowLeft, X, Upload, Loader2,
  CheckCircle2, AlertTriangle, Copy, ExternalLink,
} from 'lucide-react'

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
    paid: false,
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
    slug: 'builder',
    price: '₹999',
    period: '/month',
    description: 'For founders moving fast.',
    highlight: true,
    badge: 'Most Popular',
    paid: true,
    cta: 'Upgrade to Builder',
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
    slug: 'studio',
    price: '₹2,999',
    period: '/month',
    description: 'For teams shipping continuously.',
    highlight: false,
    badge: null,
    paid: true,
    cta: 'Upgrade to Studio',
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

const UPI_ID = 'debsouryadatta-1@oksbi'

type Step = 'qr' | 'upload' | 'success'

export default function PricingPage() {
  const { data: authSession } = useSession()
  const [userPlan, setUserPlan] = useState<string | null>(null)

  useEffect(() => {
    if (!authSession) return
    fetch('/api/me').then(r => r.json()).then(d => { if (d.plan) setUserPlan(d.plan) }).catch(() => {})
  }, [authSession])

  const [modalPlan, setModalPlan] = useState<typeof plans[number] | null>(null)
  const [step,      setStep]      = useState<Step>('qr')
  const [copied,    setCopied]    = useState(false)
  const [file,      setFile]      = useState<File | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const openModal = (plan: typeof plans[number]) => {
    if (!authSession) {
      window.location.href = `/signin?redirect=${encodeURIComponent('/pricing')}`
      return
    }
    setModalPlan(plan)
    setStep('qr')
    setFile(null)
    setPreview(null)
    setError('')
  }

  const closeModal = () => {
    if (loading) return
    setModalPlan(null)
  }

  const copyUPI = async () => {
    await navigator.clipboard.writeText(UPI_ID)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (f.size > 5 * 1024 * 1024)    { setError('File must be under 5 MB.'); return }
    setError('')
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file || !modalPlan) return
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('plan',       modalPlan.slug!)
      fd.append('screenshot', file)

      const res  = await fetch('/api/payment/submit', { method: 'POST', body: fd })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setStep('success')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      {/* Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 -left-60 w-[700px] h-[700px] rounded-full bg-indigo-100/50 blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Startup Swarm
          </Link>
        </div>

        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wide mb-5">
            Pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-5">
            Simple, honest pricing.
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            We cover the AI and sandbox costs. You just pay for what you use.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 items-center mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-8 transition-all ${
                plan.highlight
                  ? 'bg-white border-indigo-200 shadow-2xl shadow-indigo-500/10 md:scale-[1.03] z-10'
                  : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg shadow-indigo-500/30">
                  {plan.badge}
                </div>
              )}
              {!plan.badge && userPlan && userPlan === (plan.name.toLowerCase()) && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg shadow-emerald-500/30">
                  Current plan
                </div>
              )}

              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h2>
                <p className="text-sm text-gray-400 mb-5">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-sm text-gray-400">{plan.period}</span>}
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

              {(() => {
                const isCurrentPlan = !!userPlan && userPlan === plan.name.toLowerCase()

                // User is on this plan — show Go to Dashboard
                if (isCurrentPlan) {
                  return (
                    <a
                      href="/launch"
                      className="w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={15} />
                      Go to Dashboard
                    </a>
                  )
                }

                // Paid plan — open UPI modal (handles auth redirect internally)
                if (plan.paid) {
                  return (
                    <button
                      onClick={() => openModal(plan)}
                      className={`w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all ${
                        plan.highlight
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                          : 'bg-[#fafafa] border border-gray-200 text-gray-900 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  )
                }

                // Free (Hobby) plan — auth aware
                if (authSession) {
                  return (
                    <a
                      href="/launch"
                      className="w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all bg-[#fafafa] border border-gray-200 text-gray-900 hover:border-indigo-300 hover:text-indigo-600"
                    >
                      Go to Dashboard
                    </a>
                  )
                }

                return (
                  <a
                    href="/signup"
                    className="w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all bg-[#fafafa] border border-gray-200 text-gray-900 hover:border-indigo-300 hover:text-indigo-600"
                  >
                    {plan.cta}
                  </a>
                )
              })()}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 grid sm:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">What&apos;s a swarm run?</p>
            <p className="text-xs text-gray-500 leading-relaxed">One run = all your selected agents working in parallel on your idea to produce a full output.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Do I need an API key?</p>
            <p className="text-xs text-gray-500 leading-relaxed">No. We handle the AI infrastructure. Just sign up, select a model, and launch.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">How does payment work?</p>
            <p className="text-xs text-gray-500 leading-relaxed">Pay via UPI, upload your screenshot, and we&apos;ll activate your plan within a few hours.</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Questions? Email us at{' '}
          <a href="mailto:hello@startupswarm.dev" className="underline hover:text-indigo-600 transition-colors">
            hello@startupswarm.dev
          </a>
        </p>
      </div>

      {/* ── Payment Modal ── */}
      {modalPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-0">
              <div>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">
                  Upgrade to {modalPlan.name}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {modalPlan.price}<span className="text-sm font-normal text-gray-400">{modalPlan.period}</span>
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>

            {/* Step indicator */}
            {step !== 'success' && (
              <div className="flex items-center gap-2 px-6 pt-4">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 'qr' ? 'text-indigo-600' : 'text-green-600'}`}>
                  {step === 'upload' ? <CheckCircle2 size={13} /> : <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>}
                  Pay via UPI
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 'upload' ? 'text-indigo-600' : 'text-gray-300'}`}>
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${step === 'upload' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>2</span>
                  Upload proof
                </div>
              </div>
            )}

            <div className="p-6">

              {/* ── Step 1: QR code ── */}
              {step === 'qr' && (
                <div className="space-y-5">
                  <p className="text-sm text-gray-500 text-center leading-relaxed">
                    Scan the QR code or copy the UPI ID to pay. Then click &quot;I&apos;ve paid&quot; to upload your screenshot.
                  </p>

                  <div className="flex justify-center">
                    <div className="rounded-2xl border border-gray-200 p-3 bg-white shadow-sm inline-block">
                      <Image
                        src="/upi-qr.png"
                        alt="UPI QR Code — Debsourya Datta"
                        width={220}
                        height={220}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">UPI ID</p>
                      <p className="text-sm font-mono font-semibold text-gray-800 truncate">{UPI_ID}</p>
                    </div>
                    <button
                      onClick={copyUPI}
                      className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shrink-0"
                    >
                      {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                    <strong>Note:</strong> Please include your email <span className="font-mono">{authSession?.user?.email}</span> in the UPI payment note/remarks so we can verify faster.
                  </div>

                  <button
                    onClick={() => setStep('upload')}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    I&apos;ve paid — Upload Screenshot →
                  </button>
                </div>
              )}

              {/* ── Step 2: Upload screenshot ── */}
              {step === 'upload' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 text-center leading-relaxed">
                    Upload your UPI payment screenshot. We&apos;ll verify and activate your plan within a few hours.
                  </p>

                  {/* Drop zone */}
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all min-h-[180px] ${
                      preview
                        ? 'border-indigo-300 bg-indigo-50/30 p-0 overflow-hidden'
                        : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/20 p-8'
                    }`}
                  >
                    {preview ? (
                      <>
                        <Image
                          src={preview}
                          alt="Payment screenshot preview"
                          width={400}
                          height={300}
                          className="w-full h-48 object-cover rounded-2xl"
                        />
                        <div className="absolute top-2 right-2">
                          <button
                            onClick={e => { e.stopPropagation(); setFile(null); setPreview(null) }}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                          >
                            <X size={11} />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                          Click to change
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                          <Upload size={20} className="text-indigo-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-800">Drop screenshot here</p>
                          <p className="text-xs text-gray-400 mt-1">or click to browse · PNG, JPG up to 5 MB</p>
                        </div>
                      </>
                    )}
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      <AlertTriangle size={14} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep('qr')}
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors disabled:opacity-50"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!file || loading}
                      className="flex-[2] py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                      {loading && <Loader2 size={14} className="animate-spin" />}
                      {loading ? 'Submitting…' : 'Submit for review'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Success ── */}
              {step === 'success' && (
                <div className="flex flex-col items-center gap-5 py-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Request received!</h3>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                      We&apos;ve received your payment screenshot. Your <strong>{modalPlan.name}</strong> plan will be activated within a few hours after verification.
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 text-xs text-gray-500 leading-relaxed w-full text-left space-y-1">
                    <p>✓ Screenshot uploaded successfully</p>
                    <p>⏳ Admin review: usually within a few hours</p>
                    <p>📧 You&apos;ll be able to launch more swarms once approved</p>
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={closeModal}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Close
                    </button>
                    <a
                      href="/launch"
                      className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={13} />
                      Go to Launch
                    </a>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
