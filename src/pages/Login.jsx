import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../api/client'
import * as authApi from '../api/auth'
import Logo from '../components/Logo'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // Forgot Password Modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotStep, setForgotStep] = useState(1) // 1 = request code, 2 = reset password
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't sign you in — check your details and try again."))
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReset = async (e) => {
    e.preventDefault()
    if (!forgotEmail || !forgotEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    setForgotLoading(true)
    try {
      const res = await authApi.requestPasswordReset(forgotEmail)
      toast.success(res.message || 'Reset code sent to your email!')
      setResetCode('')
      setForgotStep(2)
    } catch (err) {
      toast.error(getErrorMessage(err, "No account found with this email."))
    } finally {
      setForgotLoading(false)
    }
  }

  const handleConfirmReset = async (e) => {
    e.preventDefault()
    if (!resetCode || !newPassword) {
      toast.error('Please fill in all fields')
      return
    }
    setForgotLoading(true)
    try {
      await authApi.confirmPasswordReset({ email: forgotEmail, reset_code: resetCode, new_password: newPassword })
      toast.success('Password reset successfully! You can now sign in.')
      setEmail(forgotEmail)
      setShowForgotModal(false)
      setForgotStep(1)
      setForgotEmail('')
      setResetCode('')
      setNewPassword('')
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to reset password. Please check your code."))
    } finally {
      setForgotLoading(false)
    }
  }

  const inputClass =
    'w-full bg-well text-ink border border-rule rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors'
  const labelClass = 'block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5'

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="mb-4">
            <Logo size={56} />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink tracking-tight">EventLedger AI</h1>
          <p className="text-sm text-primary-400 font-medium mt-1 italic">From Chaos to Celebration.</p>
        </div>
        <div className="bg-card p-8 rounded-2xl border border-rule">
          {error && (
            <div className="mb-4 text-sm text-deficit-600 bg-deficit-50 border border-deficit-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <GoogleSignInButton label="Sign in with Google" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-ink/60 uppercase tracking-wide">Password</label>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setForgotEmail(email); }}
                  className="text-xs font-semibold text-primary-500 hover:text-primary-400 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-ink/55 mt-7 text-center">
            New here?{' '}
            <Link to="/register" className="text-primary-500 font-semibold hover:text-primary-400">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-rule rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in text-left">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-bold text-ink">Reset Your Password</h3>
              <button onClick={() => setShowForgotModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-3">
                <p className="text-xs text-ink/60 mb-2">Enter your email address to receive a 6-digit password reset code:</p>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {forgotLoading ? 'Generating Code…' : 'Send Reset Code →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-3">
                <p className="text-xs text-ink/60 mb-2">Enter the 6-digit code and your new password:</p>
                <div>
                  <label className={labelClass}>Reset Code</label>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {forgotLoading ? 'Updating Password…' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotStep(1)}
                  className="w-full text-center text-xs text-ink/50 hover:text-ink pt-1"
                >
                  ← Change Email
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
