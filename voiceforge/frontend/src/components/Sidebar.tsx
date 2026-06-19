import { NavLink } from 'react-router-dom'
import { Mic2, Users, Repeat2, History, Zap } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Generate', icon: Mic2 },
  { to: '/voices', label: 'Voices', icon: Users },
  { to: '/vc', label: 'Voice Conversion', icon: Repeat2 },
  { to: '/history', label: 'History', icon: History },
]

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-forge-surface border-r border-forge-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-forge-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-forge-accent rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-forge-text leading-none">VoiceForge</p>
            <p className="text-xs text-forge-muted">Offline TTS Studio</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-forge-accent/15 text-forge-accent-hover'
                : 'text-forge-text-dim hover:bg-forge-card hover:text-forge-text'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-forge-border">
        <p className="text-xs text-forge-muted">Powered by Chatterbox</p>
        <p className="text-xs text-forge-muted">CPU-only · fully offline</p>
      </div>
    </aside>
  )
}
