import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useTheme } from './ThemeContext'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: '✓', bar: '#10B981', bgLight: '#D1FAE5', textLight: '#065F46', bgDark: '#0F2A22', textDark: '#6EE7B7' },
  error: { icon: '✕', bar: '#F43F5E', bgLight: '#FFE1E5', textLight: '#9F1239', bgDark: '#301019', textDark: '#FDA4AF' },
  info: { icon: 'ℹ', bar: '#2563EB', bgLight: '#DBEAFE', textLight: '#1E40AF', bgDark: '#0E1A38', textDark: '#7FA8F8' },
}

export function ToastProvider({ children }) {
  const { theme } = useTheme()
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, type }])
    if (duration) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  const toast = {
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    info: (msg, duration) => showToast(msg, 'info', duration),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.success
          const iconBg = theme === 'light' ? s.bgLight : s.bgDark
          const iconText = theme === 'light' ? s.textLight : s.textDark
          return (
            <div
              key={t.id}
              className="toast-in flex items-start gap-3 bg-card border border-rule rounded-xl shadow-lg px-4 py-3"
              style={{ borderLeft: `3px solid ${s.bar}` }}
            >
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: iconBg, color: iconText }}
              >
                {s.icon}
              </span>
              <p className="text-sm text-ink flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-ink/40 hover:text-ink text-sm leading-none shrink-0"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
