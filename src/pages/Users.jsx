import { useEffect, useState } from 'react'
import * as usersApi from '../api/users'
import { useAuth } from '../context/AuthContext'
import { useActiveEvent } from '../context/EventContext'
import { getErrorMessage } from '../api/client'

export default function Users() {
  const { user: currentUser } = useAuth()
  const { activeEventId } = useActiveEvent()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [roleForm, setRoleForm] = useState({ user_id: '', role: 'volunteer', dept_id: '' })
  const [pwForm, setPwForm] = useState({ user_id: '', new_password: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [u, log] = await Promise.all([usersApi.listUsers(), usersApi.getAuditLog()])
      setUsers(u)
      setAuditLog(log)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser?.is_super_admin) load()
    else setLoading(false)
  }, [currentUser])

  if (!currentUser?.is_super_admin) {
    return (
      <div className="bg-card border border-rule rounded-xl p-8 text-center">
        <p className="text-ink/70">This section is available to Super Admins only.</p>
      </div>
    )
  }

  const handleAssignRole = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      await usersApi.assignRole({
        user_id: Number(roleForm.user_id),
        event_id: activeEventId ? Number(activeEventId) : null,
        role: roleForm.role,
        dept_id: roleForm.dept_id ? Number(roleForm.dept_id) : null,
      })
      setMessage('Role assigned.')
      setRoleForm({ user_id: '', role: 'volunteer', dept_id: '' })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to assign role'))
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      await usersApi.resetPassword({ user_id: Number(pwForm.user_id), new_password: pwForm.new_password })
      setMessage('Password reset.')
      setPwForm({ user_id: '', new_password: '' })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset password'))
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-ink mb-6">Users</h2>

      <div className="flex bg-well rounded-xl p-1 mb-6 w-fit">
        {['users', 'assign role', ...(currentUser?.is_super_admin ? ['reset password'] : []), 'audit log'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-card shadow-sm text-ink' : 'text-ink/55'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 text-sm text-deficit-500 bg-deficit-50 rounded px-3 py-2">{error}</div>}
      {message && <div className="mb-4 text-sm text-primary-400 bg-primary-500/15 rounded px-3 py-2">{message}</div>}

      {loading ? (
        <p className="text-ink/55 text-sm">Loading...</p>
      ) : tab === 'users' ? (
        <div className="bg-card border border-rule rounded-xl divide-y divide-rule">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: u.avatar_color || '#6366f1' }}
                >
                  {u.name?.[0]?.toUpperCase() || '?'}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{u.name}</p>
                  <p className="text-xs text-ink/55">{u.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink/70">{u.role}{u.is_super_admin ? ' · Super Admin' : ''}</p>
                <p className="text-xs text-ink/40">{u.org_name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'assign role' ? (
        <form onSubmit={handleAssignRole} className="bg-card border border-rule rounded-xl p-5 space-y-3 max-w-md">
          <p className="text-xs text-ink/55 -mt-1 mb-2">
            {activeEventId ? 'Applies to your active event.' : 'No active event selected — role will be global.'}
          </p>
          <select required value={roleForm.user_id} onChange={(e) => setRoleForm({ ...roleForm, user_id: e.target.value })} className="w-full border border-rule rounded px-3 py-2 text-sm">
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <select value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })} className="w-full border border-rule rounded px-3 py-2 text-sm">
            <option value="volunteer">Volunteer</option>
            <option value="dept_head">Department Head</option>
            <option value="finance_head">Finance Head</option>
            <option value="event_admin">Event Admin</option>
          </select>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">Assign role</button>
        </form>
      ) : tab === 'reset password' ? (
        <form onSubmit={handleResetPassword} className="bg-card border border-rule rounded-xl p-5 space-y-3 max-w-md">
          <select required value={pwForm.user_id} onChange={(e) => setPwForm({ ...pwForm, user_id: e.target.value })} className="w-full border border-rule rounded px-3 py-2 text-sm">
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <input type="password" required placeholder="New password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} className="w-full border border-rule rounded px-3 py-2 text-sm" />
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">Reset password</button>
        </form>
      ) : (
        <div className="bg-card border border-rule rounded-xl divide-y divide-rule">
          {auditLog.length === 0 ? (
            <p className="text-ink/55 text-sm px-5 py-3">No audit log entries yet.</p>
          ) : (
            auditLog.map((entry) => (
              <div key={entry.id} className="px-5 py-3">
                <p className="text-sm text-ink">
                  <span className="font-medium">{entry.user_name || 'System'}</span> — {entry.action || JSON.stringify(entry)}
                </p>
                <p className="text-xs text-ink/40">{entry.created_at}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
