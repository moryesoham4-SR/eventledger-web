import { useEffect, useState } from 'react'
import * as usersApi from '../api/users'
import * as departmentsApi from '../api/departments'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function TeamRosterModal({ isOpen, onClose, eventId, eventName, canManageInvites = true }) {
  const toast = useToast()
  const [team, setTeam] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('dept_head')
  const [deptId, setDeptId] = useState('')

  const loadData = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const [teamList, deptsList] = await Promise.all([
        usersApi.getEventTeam(eventId),
        departmentsApi.listDepartments(eventId)
      ])
      setTeam(teamList)
      setDepartments(deptsList)
    } catch (err) {
      toast.error('Failed to load team roster.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && eventId) {
      loadData()
    }
  }, [isOpen, eventId])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter an email address')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        event_id: Number(eventId),
        email,
        name: name || undefined,
        role,
        dept_id: deptId ? Number(deptId) : undefined
      }
      const res = await usersApi.inviteMember(payload)
      toast.success(res.message || 'Invitation sent successfully!')
      setEmail('')
      setName('')
      setRole('dept_head')
      setDeptId('')
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to invite team member.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const getRoleBadge = (m) => {
    const r = m.role
    if (r === 'event_admin') return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-400 border border-primary-500/30 flex items-center gap-1">👑 Event Head / Lead</span>
    if (r === 'co_host') return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">⭐ Co-Head</span>
    if (r === 'finance_head') return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-positive-500/20 text-positive-400 border border-positive-500/30 flex items-center gap-1">💰 Finance Head</span>
    if (r === 'dept_head') return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">🏷️ {m.dept_name ? `${m.dept_name} Head` : 'Dept Head'}</span>
    return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-ink/10 text-ink/70 border border-rule flex items-center gap-1">🤝 Volunteer</span>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-card border border-rule rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-rule flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">👥 Team Roster & Role Assignments</h3>
            <p className="text-xs text-ink/60">{eventName ? `Official positions & team roster for ${eventName}` : 'Manage event access'}</p>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl font-bold px-2 py-1">✕</button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Invite Form (Head & Co-Head Only) */}
          {canManageInvites ? (
            <form onSubmit={handleInvite} className="p-4 bg-well/50 border border-rule rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink/70">Invite New Team Member (Head & Co-Head Only)</h4>
                <span className="text-[10px] bg-primary-500/20 text-primary-400 font-bold px-2 py-0.5 rounded border border-primary-500/30">Head Authority</span>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@org.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-1.5 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Alex Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-1.5 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-1.5 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                >
                  <option value="dept_head">Department Head</option>
                  <option value="finance_head">Finance Head</option>
                  <option value="event_admin">Event Co-Host / Admin</option>
                  <option value="volunteer">Volunteer</option>
                </select>
              </div>
              {role === 'dept_head' && (
                <div>
                  <label className="block text-xs font-semibold text-ink/70 mb-1">Assigned Department</label>
                  <select
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    className="w-full border border-rule rounded-lg px-3 py-1.5 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                  >
                    <option value="">Select department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              >
                {submitting ? 'Sending Invite…' : '✉️ Send Team Invite'}
              </button>
            </div>
          </form>
          ) : null}

          {/* Current Team Roster */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink/70 mb-3">Current Team Members ({team.length})</h4>
            {loading ? (
              <p className="text-xs text-ink/50 py-4 text-center">Loading team members...</p>
            ) : team.length === 0 ? (
              <p className="text-xs text-ink/50 py-4 text-center">No team members assigned yet. Use the form above to send an invite!</p>
            ) : (
              <div className="border border-rule rounded-xl divide-y divide-rule bg-card overflow-hidden">
                {team.map((member) => (
                  <div key={member.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-well/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: member.avatar_color || '#4285F4' }}
                      >
                        {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">{member.name || member.email}</span>
                          {getRoleBadge(member)}
                        </div>
                        <p className="text-[11px] text-ink/50 mt-0.5">
                          {member.email} {member.dept_name ? `· Department: ${member.dept_name}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-rule bg-well/30 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs font-semibold px-4 py-2 border border-rule rounded-xl bg-card text-ink hover:border-ink/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
