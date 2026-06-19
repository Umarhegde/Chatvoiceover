import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const add = useCallback((type: ToastType, message: string) => {
    const id = String(++counter.current)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  const value: ToastContextValue = {
    toast: add,
    success: msg => add('success', msg),
    error: msg => add('error', msg),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() =>
            setToasts(prev => prev.filter(x => x.id !== t.id))
          } />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const isSuccess = toast.type === 'success'
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl shadow-xl border animate-fade-in
      ${isSuccess
        ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-200'
        : 'bg-red-950/90 border-red-700/50 text-red-200'
      }`}
    >
      {isSuccess
        ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      }
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button onClick={onDismiss} className="text-current opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
