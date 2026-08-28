import { useEffect, useState } from 'react'

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Check if user previously dismissed prompt in this session
      if (!sessionStorage.getItem('pwa_banner_dismissed')) {
        setShowBanner(true)
      }
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    sessionStorage.setItem('pwa_banner_dismissed', 'true')
  }

  if (isInstalled || !showBanner) {
    return null
  }

  return (
    <div className="mx-3 my-2 p-3 bg-gradient-to-r from-primary-600/20 via-emerald-500/15 to-primary-500/10 border border-primary-500/30 rounded-xl flex flex-col gap-2 shadow-sm animate-fade-in">
      <div className="flex items-center gap-2.5">
        <span className="text-xl shrink-0">📱</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-ink truncate">Install EventLedger App</h4>
          <p className="text-[11px] text-ink/65 leading-tight">1-Click Home Screen access & offline mode</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xs active:scale-95 transition-all text-center"
        >
          📲 Install App
        </button>
        <button
          onClick={handleDismiss}
          className="text-xs font-medium text-ink/50 hover:text-ink px-2 py-1"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
