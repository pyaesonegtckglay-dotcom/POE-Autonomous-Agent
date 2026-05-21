'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { healthCheck } from '@/lib/api'
import clsx from 'clsx'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/logs', label: 'Logs' },
  { href: '/deploy', label: 'Deploy' },
  { href: '/settings', label: 'Settings' },
]

export function Navbar() {
  const pathname = usePathname()
  const [health, setHealth] = useState<'checking' | 'healthy' | 'error'>('checking')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        await healthCheck()
        setHealth('healthy')
      } catch {
        setHealth('error')
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-poe-blue/20 backdrop-blur-md bg-poe-dark/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="https://i.imgur.com/kRVXVzS.png"
                alt="POE Logo"
                className="w-10 h-10 rounded-lg object-contain"
                onError={(e) => {
                  // Fallback if imgur image fails
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
              {/* Fallback SVG logo */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-poe-purple to-poe-cyan flex items-center justify-center text-white font-bold text-sm absolute inset-0">
                POE
              </div>
            </div>
            <div>
              <span className="poe-gradient-text font-bold text-lg">POE</span>
              <span className="text-slate-300 text-sm ml-1">Autonomous Agent</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  pathname?.startsWith(item.href)
                    ? 'bg-poe-blue/20 text-poe-cyan border border-poe-blue/30'
                    : 'text-slate-400 hover:text-poe-cyan hover:bg-poe-blue/10'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Health indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-2 h-2 rounded-full',
                  health === 'healthy' ? 'bg-green-400 live-indicator' :
                  health === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                )}
              />
              <span className="text-xs text-slate-400 hidden sm:block">
                {health === 'healthy' ? 'Backend Online' : health === 'error' ? 'Backend Offline' : 'Checking...'}
              </span>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-poe-blue/20 py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={clsx(
                  'block px-4 py-2 text-sm font-medium transition-colors',
                  pathname?.startsWith(item.href)
                    ? 'text-poe-cyan bg-poe-blue/20'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
