import { useEffect, useState } from 'react'
import * as usersApi from '../api/users'
import { useAuth } from '../context/AuthContext'
import { useActiveEvent } from '../context/EventContext'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function Users() {
  const toast = useToast()
  const { user: currentUser } = useAuth()
  const { activeEventId } = useActiveEvent()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
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

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.org_name && u.org_name.toLowerCase().includes(q))
    )
  })

  if (!currentUser?.is_super_admin) {
    return (
      <div className="bg-card border border-rule rounded-xl p-8 text-center">
        <p className="text-ink/70">This section is available to Super Admins only.</p>
      </div>
    )
  }

  const handleAssignRole = async (e) => {
    e.preventDefault()
    try {
      await usersApi.assignRole({
        user_id: Number(roleForm.user_id),
        event_id: activeEventId ? Number(activeEventId) : null,
        role: roleForm.role,
        dept_id: roleForm.dept_id ? Number(roleForm.dept_id) : null,
      })
      toast.success('Role assigned')
      setRoleForm({ user_id: '', role: 'volunteer', dept_id: '' })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to assign role'))
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      await usersApi.resetPassword({ user_id: Number(pwForm.user_id), new_password: pwForm.new_password })
      toast.success('Password reset')
      setPwForm({ user_id: '', new_password: '' })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reset password'))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">Users</h2>
        {tab === 'users' && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-well border border-rule rounded-full px-3.5 py-1.5 pl-8 text-xs text-ink placeholder:text-ink/40 focus:outline-hidden focus:border-primary-500 w-48 sm:w-64 transition-all"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-xs"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

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

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : tab === 'users' ? (
        filteredUsers.length === 0 ? (
          <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm text-ink/60">
              {searchQuery ? `No users matching "${searchQuery}"` : 'No users found.'}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule rounded-xl divide-y divide-rule">
            {filteredUsers.map((u) => (
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
          <select required value={roleForm.user_id} onChange={(e) => setRoleForm({ ...roleForm, user_id: e.target.value })} className="w-full bg-well border border-rule rounded px-3 py-2 text-sm">
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <select value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })} className="w-full bg-well border border-rule rounded px-3 py-2 text-sm">
            <option value="volunteer">Volunteer</option>
            <option value="dept_head">Department Head</option>
            <option value="finance_head">Finance Head</option>
            <option value="event_admin">Event Admin</option>
          </select>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">Assign role</button>
        </form>
      ) : tab === 'reset password' ? (
        <form onSubmit={handleResetPassword} className="bg-card border border-rule rounded-xl p-5 space-y-3 max-w-md">
          <select required value={pwForm.user_id} onChange={(e) => setPwForm({ ...pwForm, user_id: e.target.value })} className="w-full bg-well border border-rule rounded px-3 py-2 text-sm">
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <input type="password" required placeholder="New password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} className="w-full bg-well border border-rule rounded px-3 py-2 text-sm" />
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
