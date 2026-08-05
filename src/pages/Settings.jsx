import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../api/client'
import * as usersApi from '../api/users'

const THEMES = [
  { value: 'dark', label: 'Dark', hint: 'Midnight Festival — the default', swatch: ['#0B1220', '#FF7A00'] },
  { value: 'light', label: 'Light', hint: 'Same layout, bright surfaces', swatch: ['#F4F6FA', '#FF7A00'] },
]

const AVATAR_COLORS = ['#FF7A00', '#2563EB', '#7C3AED', '#10B981', '#F43F5E', '#F59E0B', '#0EA5E9', '#EC4899']

const inputClass =
  'w-full bg-well text-ink border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors'
const labelClass = 'block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { user, updateUser } = useAuth()
  const toast = useToast()

  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [avatarColor, setAvatarColor] = useState('#FF7A00')
  const [savingProfile, setSavingProfile] = useState(false)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    usersApi
      .getMyProfile()
      .then((p) => {
        setProfile(p)
        setName(p.name || '')
        setAvatarColor(p.avatar_color || '#FF7A00')
      })
      .catch(() => toast.error("Couldn't load your profile"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await usersApi.updateMyProfile({ name, avatar_color: avatarColor })
      setProfile(updated)
      updateUser({ name: updated.name, avatar_color: updated.avatar_color })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't update your profile"))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error("New passwords don't match")
      return
    }
    setSavingPassword(true)
    try {
      await usersApi.changeMyPassword({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      toast.success('Password changed')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't change your password"))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="font-display text-2xl font-semibold text-ink mb-6">Settings</h2>

      <div className="bg-card border border-rule rounded-xl p-5 mb-6">
        <h3 className="font-display font-semibold text-ink mb-1">Appearance</h3>
        <p className="text-sm text-ink/55 mb-4">Choose how EventLedger AI looks on this device.</p>

        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const active = theme === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  active ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-rule hover:border-primary-400'
                }`}
              >
                <div
                  className="h-14 rounded-lg mb-3 flex items-center justify-end p-2"
                  style={{ background: t.swatch[0] }}
                >
                  <span className="w-5 h-5 rounded-full" style={{ background: t.swatch[1] }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t.label}</span>
                  {active && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary-500">Active</span>
                  )}
                </div>
                <p className="text-xs text-ink/50 mt-0.5">{t.hint}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-card border border-rule rounded-xl p-5 mb-6">
        <h3 className="font-display font-semibold text-ink mb-1">Profile</h3>
        <p className="text-sm text-ink/55 mb-4">Your info — visible to your team on events you're part of.</p>

        {!profile ? (
          <p className="text-sm text-ink/50">Loading...</p>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              <span
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {name?.[0]?.toUpperCase() || '?'}
              </span>
              <div className="flex-1">
                <label className={labelClass}>Avatar color</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setAvatarColor(c)}
                      className="w-6 h-6 rounded-full transition-transform"
                      style={{
                        backgroundColor: c,
                        outline: avatarColor === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                        transform: avatarColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                      aria-label={`Choose ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input value={profile.email} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
              <p className="text-xs text-ink/40 mt-1">Email can't be changed here.</p>
            </div>

            {profile.org_name && (
              <div>
                <label className={labelClass}>Organization</label>
                <input value={profile.org_name} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </div>

      <div className="bg-card border border-rule rounded-xl p-5">
        <h3 className="font-display font-semibold text-ink mb-1">Change password</h3>
        <p className="text-sm text-ink/55 mb-4">You'll need your current password to set a new one.</p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className={labelClass}>Current password</label>
            <input
              type="password"
              required
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>New password</label>
            <input
              type="password"
              required
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confirm new password</label>
            <input
              type="password"
              required
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
