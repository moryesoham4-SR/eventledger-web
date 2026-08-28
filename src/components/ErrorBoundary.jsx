import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      const errDetail = this.state.error?.stack || this.state.error?.message || String(this.state.error || 'Unknown Error')

      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
          <div className="bg-card border border-rule rounded-2xl p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl border border-amber-500/20">
              ⚠️
            </div>
            <h2 className="font-display text-2xl font-bold text-ink">Something went wrong</h2>
            <p className="text-sm text-ink/65">
              An unexpected error occurred while loading this page. Click below to reload your session safely.
            </p>
            <div className="bg-well border border-rule/70 rounded-xl p-3 text-left max-h-48 overflow-y-auto">
              <pre className="text-[11px] font-mono text-deficit-500 whitespace-pre-wrap break-words">
                {errDetail}
              </pre>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-5 py-2.5 rounded-full shadow-xs active:scale-95 transition-all"
              >
                🔄 Go to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="border border-rule text-ink/75 hover:border-primary-400 text-xs font-semibold px-4 py-2.5 rounded-full transition-all"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
