import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useActiveEvent } from '../context/EventContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../api/client'
import * as usersApi from '../api/users'
import * as integrationsApi from '../api/integrations'

function GoogleSheetsIntegrationSection({ activeEventId }) {
  const toast = useToast()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [scriptTemplate, setScriptTemplate] = useState('')
  const [showScriptModal, setShowScriptModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (activeEventId) {
      integrationsApi
        .getGoogleSheetsConfig(activeEventId)
        .then((cfg) => {
          setWebhookUrl(cfg.webhook_url || '')
          setIsAutoSyncEnabled(Boolean(cfg.is_auto_sync_enabled))
          setLastSyncedAt(cfg.last_synced_at)
          setScriptTemplate(cfg.script_template || '')
        })
        .catch(() => {})
    }
  }, [activeEventId])

  const handleSaveConfig = async (e) => {
    e.preventDefault()
    if (!activeEventId) return
    setSaving(true)
    try {
      await integrationsApi.saveGoogleSheetsConfig({
        event_id: Number(activeEventId),
        webhook_url: webhookUrl.trim(),
        is_auto_sync_enabled: isAutoSyncEnabled,
      })
      toast.success('Google Sheets Webhook saved!')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save webhook'))
    } finally {
      setSaving(false)
    }
  }

  const handleSyncAll = async () => {
    if (!activeEventId) return
    setSyncing(true)
    try {
      const res = await integrationsApi.triggerSyncAll(Number(activeEventId))
      toast.success(res.message || 'Full EventLedger auto-sync dispatched to Google Sheets! 📊')
      setLastSyncedAt(new Date().toISOString())
    } catch (err) {
      toast.error(getErrorMessage(err, 'Please configure Google Sheets Webhook URL first'))
    } finally {
      setSyncing(false)
    }
  }

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptTemplate)
    toast.success('Google Apps Script copied to clipboard! 📋')
  }

  return (
    <div className="lift bg-card border border-rule rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h3 className="font-display font-semibold text-ink">Google Sheets Live Auto-Sync</h3>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
            Estimated & Actual
          </span>
        </div>
      </div>
      <p className="text-sm text-ink/55 mb-4">
        Automatically sync Income, Expenses, Vendors, Sponsors, and Proposals to Google Sheets in real-time.
      </p>

      <form onSubmit={handleSaveConfig} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5">
            Google Sheets Webhook URL (Apps Script Web App)
          </label>
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full bg-well text-ink border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink/80 cursor-pointer">
            <input
              type="checkbox"
              checked={isAutoSyncEnabled}
              onChange={(e) => setIsAutoSyncEnabled(e.target.checked)}
              className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded"
            />
            <span>Enable Real-Time Background Auto-Sync (<span className="text-emerald-400">0ms UI delay</span>)</span>
          </label>

          <button
            type="button"
            onClick={() => setShowScriptModal(true)}
            className="text-xs font-bold text-primary-400 hover:text-primary-300 underline"
          >
            📋 1-Click Apps Script Code
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-rule">
          <div className="text-[11px] text-ink/50">
            {lastSyncedAt ? (
              <span>Last Synced: <strong className="text-ink/80">{new Date(lastSyncedAt).toLocaleString()}</strong></span>
            ) : (
              <span>Not synced yet.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-card border border-rule hover:bg-well text-ink text-xs font-semibold px-4 py-2 rounded-full transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Webhook URL'}
            </button>

            <button
              type="button"
              onClick={handleSyncAll}
              disabled={syncing || !webhookUrl}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xs transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{syncing ? 'Syncing...' : 'Sync All Estimated & Actual Data'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-rule rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="font-display text-lg font-bold text-ink">Google Apps Script Live Sync Template</h3>
              </div>
              <button onClick={() => setShowScriptModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <ol className="text-xs text-ink/70 space-y-1 list-decimal list-inside bg-well/50 p-3 rounded-xl border border-rule">
              <li>Open your Google Sheet ➔ Click <strong>Extensions</strong> ➔ <strong>Apps Script</strong>.</li>
              <li>Paste this script code and click <strong>Deploy</strong> ➔ <strong>New deployment</strong>.</li>
              <li>Select <strong>Web app</strong> (Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong>).</li>
              <li>Copy the generated Web App URL and paste it into EventLedger Settings!</li>
            </ol>

            <div className="relative">
              <pre className="p-4 bg-[#090D16] text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 border border-rule">
                {scriptTemplate}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleCopyScript}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-5 py-2 rounded-full shadow-xs"
              >
                📋 Copy Code Script
              </button>
              <button onClick={() => setShowScriptModal(false)} className="text-xs text-ink/60 hover:text-ink">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
  const { user, updateUser, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [avatarColor, setAvatarColor] = useState('#FF7A00')
  const [savingProfile, setSavingProfile] = useState(false)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [savingPassword, setSavingPassword] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== 'DELETE') return
    setDeletingAccount(true)
    try {
      await usersApi.deleteMyAccount()
      toast.success('Your account has been deleted successfully')
      logout()
      navigate('/register')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete account. Please try again."))
      setDeletingAccount(false)
    }
  }

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

      <div className="lift bg-card border border-rule rounded-xl p-5 mb-6">
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

      <div className="lift bg-card border border-rule rounded-xl p-5 mb-6">
        <h3 className="font-display font-semibold text-ink mb-1">Profile</h3>
        <p className="text-sm text-ink/55 mb-4">Your info — visible to your team on events you're part of.</p>

        {!profile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="skeleton h-14 w-14 rounded-full" />
              <div className="skeleton h-6 flex-1 rounded-lg" />
            </div>
            <div className="skeleton h-9 rounded-lg" />
            <div className="skeleton h-9 rounded-lg" />
          </div>
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

      <div className="lift bg-card border border-rule rounded-xl p-5 mb-6">
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

      {/* Google Sheets Real-Time Auto-Sync Integration */}
      <GoogleSheetsIntegrationSection activeEventId={activeEventId} />

      {/* Danger Zone: Delete Account */}
      <div className="bg-deficit-500/10 border border-deficit-500/30 rounded-xl p-5">
        <h3 className="font-display font-semibold text-deficit-500 mb-1">Danger Zone</h3>
        <p className="text-sm text-ink/70 mb-4">
          Permanently delete your account, workspace, and all event data. This action cannot be undone.
        </p>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="bg-deficit-600 hover:bg-deficit-700 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
        >
          <span>🗑️</span>
          <span>Delete My Account</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-deficit-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in text-left">
            <div className="flex items-center gap-3 text-deficit-500 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-display text-lg font-bold text-ink">Delete Account Permanently?</h3>
            </div>
            <p className="text-xs text-ink/70 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-ink">{user?.email}</strong>? All your events, budgets, expenses, income ledgers, and sponsorship checklists will be permanently erased.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-ink/60 uppercase tracking-wide mb-1.5">
                Type <span className="text-deficit-500 font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-rule">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-ink/60 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount || deleteConfirmText.trim() !== 'DELETE'}
                onClick={handleDeleteAccount}
                className="bg-deficit-600 hover:bg-deficit-700 disabled:opacity-40 text-white px-5 py-2 rounded-full text-xs font-bold transition-all"
              >
                {deletingAccount ? 'Deleting Account…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
