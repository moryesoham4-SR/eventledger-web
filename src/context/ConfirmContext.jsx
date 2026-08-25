import { createContext, useCallback, useContext, useState } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  // dialog: { type: 'confirm' | 'prompt', message, danger, confirmLabel, placeholder, resolve }
  const [inputValue, setInputValue] = useState('')

  /** Replaces window.confirm(message) — resolves true/false. Pass
   * { danger: true } to style the confirm button as destructive (red). */
  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setDialog({
        type: 'confirm',
        message,
        danger: opts.danger,
        confirmLabel: opts.confirmLabel || 'Confirm',
        resolve,
      })
    })
  }, [])

  /** Replaces window.prompt(message) — resolves the entered string, or null
   * if cancelled (matching prompt()'s own contract). */
  const promptText = useCallback((message, opts = {}) => {
    setInputValue('')
    return new Promise((resolve) => {
      setDialog({
        type: 'prompt',
        message,
        placeholder: opts.placeholder || '',
        confirmLabel: opts.confirmLabel || 'Submit',
        resolve,
      })
    })
  }, [])

  const close = (result) => {
    dialog?.resolve(result)
    setDialog(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm, promptText }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={() => close(dialog.type === 'confirm' ? false : null)}
        >
          <div
            className="modal-in bg-card border border-rule rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-ink/90 leading-relaxed mb-5">{dialog.message}</p>

            {dialog.type === 'prompt' && (
              <input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={dialog.placeholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') close(inputValue)
                  if (e.key === 'Escape') close(null)
                }}
                className="w-full bg-well text-ink border border-rule rounded-lg px-3 py-2 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => close(dialog.type === 'confirm' ? false : null)}
                className="text-sm border border-rule text-ink/75 px-4 py-2 rounded-full font-semibold hover:border-primary-400 hover:text-primary-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => close(dialog.type === 'confirm' ? true : inputValue)}
                className={`text-sm px-4 py-2 rounded-full font-semibold text-white active:scale-95 transition-all ${
                  dialog.danger ? 'bg-deficit-500 hover:bg-deficit-700' : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
