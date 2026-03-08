'use client'

import { useState, useEffect } from 'react'
import { Menu, X, LogIn, UserPlus, LayoutDashboard } from 'lucide-react'
import { useSession } from 'next-auth/react'

const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Agents',       href: '#agents' },
  { label: 'Features',     href: '#features' },
  { label: 'Pricing',      href: '/pricing' },
  { label: 'FAQ',          href: '#faq' },
]

export default function LandingNavbar() {
  const [isScrolled,    setIsScrolled]    = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { status } = useSession()
  const isAuthed = status === 'authenticated'

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileOpen])

  const close = () => setIsMobileOpen(false)

  return (
    <>
      <nav className={`fixed top-0 sm:top-6 left-0 right-0 z-50 px-4 sm:px-6 transition-all duration-300 ${
        isMobileOpen ? '' : 'flex justify-center'
      }`}>
        <div className={`max-w-5xl w-full flex items-center justify-between px-5 py-3.5 sm:py-4 transition-all duration-300 sm:rounded-2xl ${
          isScrolled || isMobileOpen
            ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b sm:border border-gray-200/60'
            : 'bg-transparent'
        }`}>
          <a href="#" className="flex items-center gap-2.5 text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-sm font-black shrink-0">S</span>
            Startup Swarm
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map(l => (
              <a key={l.label} href={l.href}
                className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthed ? (
              <a href="/launch"
                className="px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                <LayoutDashboard size={15} />
                Go to Dashboard
              </a>
            ) : (
              <>
                <a href="/signin"
                  className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  Sign in
                </a>
                <a href="#launch"
                  className="px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                  Launch Swarm
                </a>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 -mr-1 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileOpen(v => !v)}
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
        isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={close} />

        {/* Drawer sliding from top */}
        <div className={`absolute top-0 left-0 right-0 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isMobileOpen ? 'translate-y-0' : '-translate-y-full'
        }`}>
          {/* Header row (matches navbar) */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <a href="#" className="flex items-center gap-2.5 text-lg font-extrabold text-gray-900" onClick={close}>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-sm font-black">S</span>
              Startup Swarm
            </a>
            <button onClick={close}
              className="p-2 -mr-1 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <X size={22} />
            </button>
          </div>

          {/* Nav links */}
          <nav className="px-4 py-4 space-y-1">
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={close}
                className="flex items-center px-4 py-3 text-base font-semibold text-gray-800 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Auth buttons */}
          <div className="px-4 pb-6 pt-2 space-y-3 border-t border-gray-100">
            {isAuthed ? (
              <a href="/launch" onClick={close}
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                <LayoutDashboard size={16} />
                Go to Dashboard
              </a>
            ) : (
              <>
                <a href="/signin" onClick={close}
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <LogIn size={16} />
                  Sign In
                </a>
                <a href="/signup" onClick={close}
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                  <UserPlus size={16} />
                  Create Free Account
                </a>
                <p className="text-center text-xs text-gray-400">Your API key never leaves your browser</p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
