import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Mic2, Users, Repeat2, History, Zap, Cpu, Circle } from 'lucide-react'
import { api } from '../api'
import type { StatusResponse } from '../types'

const NAV = [
  { to: '/',        label: 'Generate',         icon: Mic2 },
  { to: '/voices',  label: 'Voices',           icon: Users },
  { to: '/vc',      label: 'Voice Conversion', icon: Repeat2 },
  { to: '/history', label: 'History',          icon: History },
]

export function Sidebar() {
  const [status, setStatus] = useState<StatusResponse | null>(null)

  useEffect(() => {
    api.status().then(setStatus).catch(() => {})
    const id = setInterval(() => api.status().then(setStatus).catch(() => {}), 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-vf-border bg-vf-surface">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-vf-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow-sm shrink-0">
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-vf-text leading-none tracking-tight">VoiceForge</p>
            <p className="text-[11px] text-vf-muted mt-0.5">Open-Source TTS Studio</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-vf-accent-dim text-vf-glow border border-vf-accent/30'
                : 'text-vf-muted hover:text-vf-text-dim hover:bg-vf-card'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-vf-accent' : ''}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* System status */}
      <div className="px-4 py-4 border-t border-vf-border space-y-2">
        {status ? (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-vf-muted">Device</span>
              <span className="badge-cpu">
                <Cpu className="w-3 h-3" />
                {status.device.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-vf-muted">Free RAM</span>
              <span className={`font-mono font-medium ${status.free_ram_gb < 4 ? 'text-vf-error' : status.free_ram_gb < 6 ? 'text-vf-warning' : 'text-vf-success'}`}>
                {status.free_ram_gb} GB
              </span>
            </div>
            {status.current_engine && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-vf-muted">Loaded</span>
                <span className={status.current_engine === 'turbo' ? 'badge-turbo' : 'badge-standard'}>
                  <Circle className="w-1.5 h-1.5 fill-current" />
                  {status.current_engine}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="skeleton h-3 rounded w-full" />)}
          </div>
        )}
        <div className="pt-1">
          <p className="text-[10px] text-vf-muted">
            Powered by{' '}
            <a href="https://github.com/resemble-ai/chatterbox" target="_blank" rel="noopener noreferrer"
               className="text-vf-accent/70 hover:text-vf-accent transition-colors">
              Chatterbox TTS
            </a>
          </p>
        </div>
      </div>
    </aside>
  )
}
