import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../api/client'
import Logo from '../components/Logo'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password, orgName)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't create your account — try again."))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-well text-ink border border-rule rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors'
  const labelClass = 'block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="mb-4">
            <Logo size={56} />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink tracking-tight">EventLedger AI</h1>
          <p className="text-sm text-primary-400 font-medium mt-1 italic">From Chaos to Celebration.</p>
        </div>
        <div className="bg-card p-8 rounded-2xl border border-rule">
          <h2 className="font-display text-xl font-semibold text-ink text-center mb-1">
            Start your ledger
          </h2>
          <p className="text-sm text-ink/55 text-center mb-7">
            Free to set up. You'll be running the show for your own events.
          </p>

          {error && (
            <div className="mb-4 text-sm text-deficit-600 bg-deficit-50 border border-deficit-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <GoogleSignInButton label="Sign up with Google" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Org / fest / team name</label>
              <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} placeholder="e.g. AlgoNexus Crew" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-sm p-1 transition-colors select-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Setting things up…' : "Let's go"}
            </button>
          </form>

          <p className="text-sm text-ink/55 mt-7 text-center">
            Already on the books?{' '}
            <Link to="/login" className="text-primary-500 font-semibold hover:text-primary-400">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
