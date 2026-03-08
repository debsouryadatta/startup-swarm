'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function SignInPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') ?? '/launch'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password.')
    } else {
      router.push(redirectTo)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Top bar */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={15} />
          Back to Startup Swarm
        </a>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8 sm:mb-10">
            <a href="/" className="inline-flex items-center gap-2.5 text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white text-base font-black">S</span>
              Startup Swarm
            </a>
            <p className="mt-3 text-gray-500 text-sm">Sign in to launch your AI founding team</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Don&apos;t have an account?{' '}
              <a href={`/signup${redirectTo !== '/launch' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                Sign up free
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
