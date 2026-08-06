import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../api/client'
import Logo from '../components/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

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
              <label className={labelClass}>Password</label>
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
    </div>
  )
}
