import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, X, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast { id: string; type: ToastType; message: string }

interface Ctx {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<Ctx | null>(null)

const META: Record<ToastType, { Icon: typeof CheckCircle2; colors: string }> = {
  success: { Icon: CheckCircle2, colors: 'bg-emerald-950/90 border-emerald-700/40 text-emerald-200' },
  error:   { Icon: XCircle,      colors: 'bg-red-950/90 border-red-700/40 text-red-200' },
  info:    { Icon: Info,         colors: 'bg-vf-card border-vf-border-hi text-vf-text-dim' },
}

function ToastItem({ t, remove }: { t: Toast; remove: () => void }) {
  const { Icon, colors } = META[t.type]
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-xl
                     backdrop-blur-sm animate-fade-up max-w-sm ${colors}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
      <p className="text-sm flex-1 leading-snug">{t.message}</p>
      <button onClick={remove} className="opacity-40 hover:opacity-80 transition-opacity ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const add = useCallback((type: ToastType, message: string) => {
    const id = String(++counter.current)
    setToasts(p => [...p, { id, type, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{
      success: m => add('success', m),
      error:   m => add('error', m),
      info:    m => add('info', m),
    }}>
      {children}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} remove={() => setToasts(p => p.filter(x => x.id !== t.id))} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
