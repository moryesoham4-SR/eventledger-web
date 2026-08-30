import { useEffect, useState } from 'react'
import * as departmentsApi from '../api/departments'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function DepartmentTeamRosterModal({ dept, eventId, eventUsers = [], canManage, onClose, onUpdated }) {
  const toast = useToast()
  const [roster, setRoster] = useState({ head: null, coworkers: [], all_members: [] })
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('volunteer')

  const loadRoster = async () => {
    if (!dept?.id) return
    setLoading(true)
    try {
      const data = await departmentsApi.getDepartmentRoster(dept.id)
      setRoster(data)
    } catch {
      setRoster({ head: null, coworkers: [], all_members: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept?.id])

  if (!dept) return null

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!selectedUserId) {
      toast.error('Please select a team member')
      return
    }
    try {
      await departmentsApi.assignDepartmentMember(dept.id, {
        event_id: Number(eventId),
        user_id: Number(selectedUserId),
        role: selectedRole,
      })
      toast.success(`Assigned as ${selectedRole === 'dept_head' ? 'Department Head 👑' : selectedRole === 'co_leader' ? 'Co-Leader 🌟' : selectedRole === 'event_admin' ? 'Event Admin 💼' : 'Co-Worker / Volunteer 🤝'}`)
      setSelectedUserId('')
      loadRoster()
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to assign team member'))
    }
  }

  const handleRemove = async (userId) => {
    try {
      await departmentsApi.removeDepartmentMember(dept.id, userId)
      toast.success('Removed member from department')
      loadRoster()
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove member'))
    }
  }

  const safeEventUsers = Array.isArray(eventUsers) ? eventUsers : []

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-card border border-rule rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: dept.color || '#6366f1' }} />
              {dept.name} Team Roster
            </h3>
            <p className="text-xs text-ink/55 mt-0.5">Manage Department Head and assigned Co-Workers.</p>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-sm font-semibold">✕</button>
        </div>

        {loading ? (
          <div className="skeleton h-32 rounded-xl" />
        ) : (
          <div className="space-y-4 text-xs">
            {/* Department Head Section */}
            <div className="p-3.5 bg-well/50 border border-rule rounded-xl space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/50 block">Department Head</span>
              {roster.head ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary-600/20 text-primary-400 font-bold flex items-center justify-center text-xs">
                      👑
                    </span>
                    <div>
                      <p className="font-bold text-ink text-sm">{roster.head.name || roster.head.email}</p>
                      <p className="text-[11px] text-ink/50">{roster.head.email}</p>
                    </div>
                  </div>
                  {canManage && (
                    <button onClick={() => handleRemove(roster.head.id)} className="text-deficit-500 hover:text-deficit-600 text-xs font-semibold">
                      Remove Head
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-ink/40 italic">Planning Stage: Managed by Co-Heads (or Head Unassigned).</p>
              )}
            </div>

            {/* Department Co-Heads Section */}
            {roster.co_heads?.length > 0 && (
              <div className="p-3.5 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 block">⭐ Department Co-Heads (Planning Stage)</span>
                <div className="space-y-1.5">
                  {roster.co_heads.map((co) => (
                    <div key={co.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-[10px]">
                          ⭐
                        </span>
                        <div>
                          <p className="font-bold text-ink text-xs">{co.name || co.email}</p>
                          <p className="text-[10px] text-ink/50">{co.email}</p>
                        </div>
                      </div>
                      {canManage && (
                        <button onClick={() => handleRemove(co.id)} className="text-deficit-500 hover:text-deficit-600 text-xs font-semibold">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Co-Workers / Volunteers Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                  Assigned Co-Workers & Volunteers ({roster.coworkers.length})
                </span>
              </div>

              {roster.coworkers.length === 0 ? (
                <div className="p-3 text-center text-ink/40 bg-well/20 rounded-xl italic">
                  No co-workers assigned to this department yet. Assign team members below!
                </div>
              ) : (
                <div className="space-y-2">
                  {roster.coworkers.map((m) => (
                    <div key={m.id} className="p-3 bg-card border border-rule rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-well text-ink font-bold flex items-center justify-center text-xs border border-rule">
                          🤝
                        </span>
                        <div>
                          <p className="font-semibold text-ink">{m.name || m.email}</p>
                          <p className="text-[11px] text-ink/50">{m.email}</p>
                        </div>
                      </div>
                      {canManage && (
                        <button onClick={() => handleRemove(m.id)} className="text-deficit-500 hover:text-deficit-600 text-xs font-semibold px-1">
                          ✕ Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign Member Form */}
            {canManage && (
              <form onSubmit={handleAssign} className="pt-3 border-t border-rule space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/60 block">+ Assign Event Team Member</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink col-span-2 font-medium"
                  >
                    <option value="">Select Team Member...</option>
                    {safeEventUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email} ({u.role ? u.role.replace('_', ' ') : 'Member'})
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink font-semibold"
                  >
                    <option value="volunteer">🤝 Co-Worker</option>
                    <option value="co_head">⭐ Department Co-Head</option>
                    <option value="dept_head">👑 Dept Head</option>
                    <option value="event_admin">💼 Event Admin</option>
                    <option value="co_leader">🌟 Co-Leader (Full Authority)</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-1.5 rounded-lg transition-all shadow-xs">
                  Save Assignment
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
