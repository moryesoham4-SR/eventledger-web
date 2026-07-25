import { useEffect, useState } from 'react'
import * as usersApi from '../api/users'
import { useAuth } from '../context/AuthContext'
import { useActiveEvent } from '../context/EventContext'

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
    load()
  }, [])

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
      setError(err.response?.data?.detail || 'Failed to assign role')
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
      setError(err.response?.data?.detail || 'Failed to reset password')
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Users</h2>

      <div className="flex bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {['users', 'assign role', ...(currentUser?.is_super_admin ? ['reset password'] : []), 'audit log'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}
      {message && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 rounded px-3 py-2">{message}</div>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : tab === 'users' ? (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
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
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">{u.role}{u.is_super_admin ? ' · Super Admin' : ''}</p>
                <p className="text-xs text-gray-400">{u.org_name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'assign role' ? (
        <form onSubmit={handleAssignRole} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3 max-w-md">
          <p className="text-xs text-gray-500 -mt-1 mb-2">
            {activeEventId ? 'Applies to your active event.' : 'No active event selected — role will be global.'}
          </p>
          <select required value={roleForm.user_id} onChange={(e) => setRoleForm({ ...roleForm, user_id: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <select value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="volunteer">Volunteer</option>
            <option value="dept_head">Department Head</option>
            <option value="finance">Finance</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium">Assign role</button>
        </form>
      ) : tab === 'reset password' ? (
        <form onSubmit={handleResetPassword} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3 max-w-md">
          <select required value={pwForm.user_id} onChange={(e) => setPwForm({ ...pwForm, user_id: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <input type="password" required placeholder="New password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium">Reset password</button>
        </form>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {auditLog.length === 0 ? (
            <p className="text-gray-500 text-sm px-5 py-3">No audit log entries yet.</p>
          ) : (
            auditLog.map((entry) => (
              <div key={entry.id} className="px-5 py-3">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{entry.user_name || 'System'}</span> — {entry.action || JSON.stringify(entry)}
                </p>
                <p className="text-xs text-gray-400">{entry.created_at}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
