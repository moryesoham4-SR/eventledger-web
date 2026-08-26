import { useEffect, useState } from 'react'
import * as authApi from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1047124970425-demo.apps.googleusercontent.com'

export default function GoogleSignInButton({ label = 'Continue with Google' }) {
  const { loginWithToken } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const handleCredentialResponse = async (response) => {
    if (!response || !response.credential) return
    try {
      setLoading(true)
      const data = await authApi.googleLogin(response.credential)
      loginWithToken(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.name || 'User'}!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load Google Identity Services SDK dynamically if not already loaded
    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => initGoogle()
      document.body.appendChild(script)
    }

    function initGoogle() {
      if (!window.google?.accounts?.id) return
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
        })
        const btnContainer = document.getElementById('google-btn-container')
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'pill',
          })
        }
      } catch {
        // Fallback gracefully
      }
    }
  }, [])

  return (
    <div className="w-full space-y-2">
      <div id="google-btn-container" className="w-full min-h-[44px] flex items-center justify-center">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (window.google?.accounts?.id) {
              window.google.accounts.id.prompt()
            } else {
              toast.error('Google OAuth client initialized. Select your Google account to log in.')
            }
          }}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 py-2.5 px-4 rounded-full text-sm font-semibold shadow-xs hover:shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{loading ? 'Signing in with Google…' : label}</span>
        </button>
      </div>

      <div className="relative flex items-center justify-center my-3">
        <div className="border-t border-rule w-full" />
        <span className="bg-card px-3 text-[11px] text-ink/40 uppercase font-semibold tracking-wider absolute">
          Or continue with email
        </span>
      </div>
    </div>
  )
}
