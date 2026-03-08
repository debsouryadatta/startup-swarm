'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Rocket, History, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface Props {
  user: { name?: string | null; email?: string | null }
}

const NAV = [
  { href: '/launch',  label: 'New Swarm', icon: Rocket  },
  { href: '/history', label: 'History',   icon: History },
] as const

export function AppSidebar({ user }: Props) {
  const path = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-gray-200 bg-white h-screen sticky top-0 z-30 overflow-hidden transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo + collapse toggle */}
        <div className="flex items-center justify-between px-3 py-5 border-b border-gray-200 shrink-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <Link
                href="/"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-sm hover:bg-indigo-500 transition-colors"
              >
                S
              </Link>
              <button
                onClick={() => setCollapsed(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-sm group-hover:bg-indigo-500 transition-colors">
                  S
                </div>
                <span className="font-bold text-gray-900 text-sm tracking-tight">Startup Swarm</span>
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-1 p-1 rounded-lg hover:bg-gray-100"
                title="Collapse sidebar"
              >
                <ChevronLeft size={15} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Workspace
            </p>
          )}
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href === '/history' && path.startsWith('/history'))
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={15} className="shrink-0" />
                {!collapsed && label}
              </Link>
            )
          })}
        </nav>

        {/* User + sign out */}
        <div className="border-t border-gray-200 p-3 space-y-1 shrink-0">
          {!collapsed && (
            <div className="rounded-xl px-3 py-2.5 bg-gray-50 border border-gray-200">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {user.name ?? user.email?.split('@')[0]}
              </p>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            title={collapsed ? 'Sign out' : undefined}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
              collapsed ? 'justify-center' : 'text-left'
            }`}
          >
            <LogOut size={13} />
            {!collapsed && 'Sign out'}
          </button>

        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">
            S
          </div>
          <span className="font-bold text-gray-900 text-sm">Startup Swarm</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-xs text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300"
        >
          Sign out
        </button>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white/95 backdrop-blur">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href === '/history' && path.startsWith('/history'))
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold tracking-wide uppercase transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </div>
    </>
  )
}
