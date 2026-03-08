'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Rocket, LogIn, UserPlus } from 'lucide-react'

export default function LaunchSection() {
  const { status } = useSession()
  const router = useRouter()

  return (
    <section id="launch" className="py-24 sm:py-32 bg-gray-50 relative overflow-hidden border-t border-gray-200/50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-indigo-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-sky-100/40 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-2xl mx-auto px-5 sm:px-6 relative z-10 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-5 sm:mb-6 tracking-tight text-gray-900">
          <span className="block leading-[1.15]">Type an idea.</span>
          <span className="block italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 py-2 leading-[1.25]">
            Launch the swarm.
          </span>
        </h2>
        <p className="text-gray-500 text-base sm:text-lg mb-10 sm:mb-12">
          Your AI founding team is ready. Just describe what you want to build.
        </p>

        {status === 'loading' && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        )}

        {status === 'unauthenticated' && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-sm">
              <a
                href="/signin"
                className="flex items-center justify-center gap-2.5 px-7 py-4 bg-gray-900 text-white font-semibold text-base rounded-2xl hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all flex-1"
              >
                <LogIn size={17} />
                Sign In
              </a>
              <a
                href="/signup"
                className="flex items-center justify-center gap-2.5 px-7 py-4 bg-white border border-gray-200 text-gray-900 font-semibold text-base rounded-2xl hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all flex-1"
              >
                <UserPlus size={17} />
                Sign Up
              </a>
            </div>
            <p className="text-xs text-gray-400">Free to try · Your API key never leaves your browser</p>
          </div>
        )}

        {status === 'authenticated' && (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => router.push('/launch')}
              className="group inline-flex items-center gap-3 px-8 sm:px-10 py-4 bg-indigo-600 text-white font-semibold text-base rounded-2xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center"
            >
              <Rocket size={18} />
              Launch Your Swarm
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="text-xs text-gray-400">One sandbox per run · Your API key never leaves your browser</p>
          </div>
        )}
      </div>
    </section>
  )
}
