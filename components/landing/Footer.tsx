import { Twitter, Github, Mail } from 'lucide-react'

const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Agents',       href: '#agents' },
  { label: 'Features',     href: '#features' },
  { label: 'FAQ',          href: '#faq' },
]

export default function LandingFooter() {
  return (
    <footer className="py-10 sm:py-12 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="flex flex-col gap-8">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            {/* Brand */}
            <a href="/" className="flex items-center gap-2.5 text-xl font-extrabold text-gray-900 tracking-tight">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-sm font-black">S</span>
              Startup Swarm
            </a>

            {/* Nav links */}
            <nav className="flex flex-wrap justify-center sm:justify-end gap-x-6 gap-y-2.5">
              {navLinks.map(l => (
                <a key={l.label} href={l.href}
                  className="text-sm text-gray-400 hover:text-indigo-600 transition-colors whitespace-nowrap">
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">
            <p className="text-gray-400 text-sm order-2 sm:order-1">
              © {new Date().getFullYear()} Startup Swarm. All rights reserved.
            </p>

            {/* Social */}
            <div className="flex gap-4 order-1 sm:order-2">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                <Twitter size={16} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                <Github size={16} />
              </a>
              <a href="mailto:hello@startupswarm.dev"
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                <Mail size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
