import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RequireActiveEvent from '../components/RequireActiveEvent'
import * as departmentsApi from '../api/departments'
import * as tasksApi from '../api/tasks'
import * as usersApi from '../api/users'
import { useMyRole } from '../hooks/useMyRole'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../api/client'

function DepartmentsContent({ eventId }) {
  const toast = useToast()
  const role = useMyRole(eventId)

  const [departments, setDepartments] = useState([])
  const [tasks, setTasks] = useState([])
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  // Create department modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deptName, setDeptName] = useState('')
  const [headName, setHeadName] = useState('')
  const [deptColor, setDeptColor] = useState('#6366f1')

  // Task creation modal
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [activeDeptId, setActiveDeptId] = useState(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState('')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDesc, setTaskDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const [deptsList, tasksList, teamList] = await Promise.all([
        departmentsApi.listDepartments(eventId).catch(() => []),
        tasksApi.listTasks(eventId).catch(() => []),
        usersApi.getEventTeam(eventId).catch(() => []),
      ])
      setDepartments(deptsList)
      setTasks(tasksList)
      setTeam(teamList)
    } catch (err) {
      toast.error('Failed to load department details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [eventId])

  const handleCreateDept = async (e) => {
    e.preventDefault()
    if (!deptName) return
    setSubmitting(true)
    try {
      await departmentsApi.createDepartment({
        event_id: Number(eventId),
        name: deptName,
        head_name: headName,
        color: deptColor,
      })
      toast.success('Department created successfully! 🏷️')
      setCreateModalOpen(false)
      setDeptName('')
      setHeadName('')
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create department.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDept = async (id, name) => {
    if (!window.confirm(`Delete department "${name}"?`)) return
    try {
      await departmentsApi.deleteDepartment(id)
      toast.success(`Department "${name}" deleted`)
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete department'))
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!taskTitle || !activeDeptId) return
    setSubmitting(true)
    try {
      const assignedUser = team.find((m) => String(m.id) === String(taskAssigneeId))
      await tasksApi.createTask({
        event_id: Number(eventId),
        department_id: Number(activeDeptId),
        assigned_to_user_id: taskAssigneeId ? Number(taskAssigneeId) : null,
        assigned_to_name: assignedUser ? (assignedUser.name || assignedUser.email) : null,
        title: taskTitle,
        description: taskDesc,
        deadline: taskDeadline,
        priority: taskPriority,
        status: 'pending',
      })
      toast.success('Work task assigned! 📋')
      setTaskModalOpen(false)
      setTaskTitle('')
      setTaskDesc('')
      setTaskDeadline('')
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to assign task'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed'
    try {
      await tasksApi.updateTask(task.id, { status: nextStatus })
      toast.success(`Task marked as ${nextStatus.replace('_', ' ')}`)
      loadData()
    } catch (err) {
      toast.error('Failed to update task status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink">🏷️ Departments & Assigned Work</h2>
          <p className="text-sm text-ink/55 mt-0.5">
            Manage event departments, assigned members, and work deadlines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/calendar"
            className="bg-card border border-rule hover:border-primary-500/40 text-ink text-xs font-semibold px-4 py-2 rounded-full transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>📅</span> View Calendar
          </Link>
          {role.canManageDepartments && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all active:scale-95 shadow-xs"
            >
              + New Department
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-card border border-rule rounded-xl p-10 text-center">
          <p className="text-ink/70 mb-4">No departments created for this event yet.</p>
          {role.canManageDepartments && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700"
            >
              Create First Department
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {departments.map((d) => {
            const deptMembers = team.filter((m) => String(m.dept_id) === String(d.id) || (m.dept_name && m.dept_name === d.name))
            const deptTasks = tasks.filter((t) => Number(t.department_id) === Number(d.id))

            return (
              <div key={d.id} className="lift bg-card border border-rule rounded-2xl p-5 space-y-4 shadow-xs">
                {/* Department Header */}
                <div className="flex items-center justify-between border-b border-rule pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: d.color || '#6366f1' }} />
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink">{d.name}</h3>
                      <p className="text-xs text-ink/55">
                        Head: <strong className="text-ink">{d.head_name || 'Unassigned'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {role.canManageWorkTasks && (
                      <button
                        onClick={() => {
                          setActiveDeptId(d.id)
                          setTaskModalOpen(true)
                        }}
                        className="text-xs font-semibold px-3 py-1.5 border border-rule rounded-lg bg-well/60 hover:bg-well text-ink transition-colors flex items-center gap-1"
                      >
                        <span>+</span> Assign Work
                      </button>
                    )}

                    {role.canManageDepartments && (
                      <button
                        onClick={() => handleDeleteDept(d.id, d.name)}
                        className="text-xs text-deficit-500 hover:text-deficit-600 font-semibold px-2 py-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Team Members in Dept */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink/50 mb-2">
                    Department Team Members ({deptMembers.length})
                  </h4>
                  {deptMembers.length === 0 ? (
                    <p className="text-xs text-ink/40 italic">No specific team members assigned to this department yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {deptMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-well/60 border border-rule text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.avatar_color || '#3B82F6' }} />
                          <span className="font-semibold text-ink">{m.name || m.email}</span>
                          <span className="text-[10px] text-ink/50">({m.role.replace('_', ' ')})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assigned Work & Deadlines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
                      Assigned Tasks & Deadlines ({deptTasks.length})
                    </h4>
                  </div>

                  {deptTasks.length === 0 ? (
                    <div className="p-3 bg-well/30 rounded-xl text-xs text-ink/40 text-center">
                      No active work tasks assigned for this department.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deptTasks.map((t) => (
                        <div key={t.id} className="p-3 bg-well/50 border border-rule rounded-xl flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-xs text-ink ${t.status === 'completed' ? 'line-through text-ink/40' : ''}`}>
                                {t.title}
                              </span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                t.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' : 'bg-ink/10 text-ink/60'
                              }`}>
                                {t.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-[11px] text-ink/55 mt-0.5">
                              👤 {t.assignee_name || t.assigned_to_name || 'Unassigned'}
                              {t.deadline ? ` · ⏰ Due: ${t.deadline}` : ''}
                            </p>
                          </div>

                          <button
                            onClick={() => handleToggleTaskStatus(t)}
                            className="text-[11px] font-semibold px-2.5 py-1 border border-rule rounded-lg bg-card hover:bg-well text-ink transition-colors whitespace-nowrap"
                          >
                            {t.status === 'completed' ? 'Reopen' : 'Complete ✓'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Dept Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-rule rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-display text-lg font-semibold text-ink">New Department</h3>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marketing, Logistics, Sponsorship"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Head of Department (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Color Theme</label>
                <input
                  type="color"
                  value={deptColor}
                  onChange={(e) => setDeptColor(e.target.value)}
                  className="h-10 w-20 border border-rule rounded-lg p-1 bg-card cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-xs font-semibold px-4 py-2 border border-rule rounded-xl bg-card text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-rule flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">📋 Assign Department Work Task</h3>
              <button onClick={() => setTaskModalOpen(false)} className="text-ink/40 hover:text-ink text-xl font-bold px-2">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Print 500 Event ID Badges"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Assign to Team Member</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink"
                >
                  <option value="">Select team member...</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email} ({m.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Details for this task..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="text-xs font-semibold px-4 py-2 border border-rule rounded-xl bg-card text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Assign Work
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Departments() {
  return <RequireActiveEvent>{(eventId) => <DepartmentsContent eventId={eventId} />}</RequireActiveEvent>
}
