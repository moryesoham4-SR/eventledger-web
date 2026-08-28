import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RequireActiveEvent from '../components/RequireActiveEvent'
import * as departmentsApi from '../api/departments'
import * as tasksApi from '../api/tasks'
import * as usersApi from '../api/users'
import { useMyRole } from '../hooks/useMyRole'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../api/client'
import DepartmentTeamRosterModal from '../components/DepartmentTeamRosterModal'

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

  // Roster modal
  const [rosterModalDept, setRosterModalDept] = useState(null)

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
      toast.success('Department created!')
      setCreateModalOpen(false)
      setDeptName('')
      setHeadName('')
      setDeptColor('#6366f1')
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create department'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDept = async (deptId, name) => {
    if (!window.confirm(`Are you sure you want to delete department "${name}"?`)) return
    try {
      await departmentsApi.deleteDepartment(deptId)
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink">🏷️ Departments & Assigned Work</h2>
          <p className="text-sm text-ink/55 mt-0.5">
            Manage event departments, Dept Heads, assigned co-workers, and work deadlines.
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
                    <button
                      onClick={() => setRosterModalDept(d)}
                      className="text-xs font-semibold px-3 py-1.5 border border-rule rounded-lg bg-well/60 hover:bg-well text-ink transition-colors flex items-center gap-1"
                    >
                      <span>👥</span> Team Roster
                    </button>

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
                          <span className="text-[10px] text-ink/50">({m.role ? m.role.replace('_', ' ') : 'Member'})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasks in Dept */}
                <div className="pt-2 border-t border-rule space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
                      Work Tasks & Deadlines ({deptTasks.length})
                    </h4>
                    {role.canManageWorkTasks && (
                      <button
                        onClick={() => {
                          setActiveDeptId(d.id)
                          setTaskModalOpen(true)
                        }}
                        className="text-[11px] text-primary-500 hover:text-primary-400 font-semibold"
                      >
                        + Add Work Task
                      </button>
                    )}
                  </div>

                  {deptTasks.length === 0 ? (
                    <p className="text-xs text-ink/40 italic">No tasks assigned for this department yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {deptTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 bg-well/50 rounded-xl border border-rule text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${t.status === 'completed' ? 'line-through text-ink/40' : 'text-ink'}`}>
                                {t.title}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  t.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : t.status === 'in_progress'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-ink/10 text-ink/70'
                                }`}
                              >
                                {t.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-[11px] text-ink/50">
                              Assigned to: <span className="font-semibold text-ink/70">{t.assigned_to_name || 'Unassigned'}</span> · Due: {t.deadline || 'No deadline'}
                            </p>
                          </div>

                          <button
                            onClick={() => handleToggleTaskStatus(t)}
                            className="text-[11px] font-semibold text-primary-500 hover:text-primary-400 border border-rule bg-card px-2 py-1 rounded-lg"
                          >
                            {t.status === 'completed' ? 'Undo' : t.status === 'pending' ? 'Start 🛠️' : 'Done ✓'}
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

      {/* Create Department Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-ink">Create New Department</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Department Name *</label>
                <input
                  required
                  placeholder="e.g. Art & Decor, Logistics, Technical"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Department Head (Optional)</label>
                <input
                  placeholder="e.g. Rahul Sharma"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Color Badge</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={deptColor}
                    onChange={(e) => setDeptColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-rule"
                  />
                  <span className="text-xs font-mono text-ink/60">{deptColor}</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-rule">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-ink/60 hover:text-ink">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs">
                  {submitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-ink">Assign Department Work Task</h3>
              <button onClick={() => setTaskModalOpen(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Task Title *</label>
                <input
                  required
                  placeholder="e.g. Purchase 50m Stage LED Lights"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Assign To Co-Worker</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink font-semibold"
                >
                  <option value="">Unassigned</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email} ({m.role ? m.role.replace('_', ' ') : 'Member'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Deadline</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink font-semibold"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High / Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Task instructions and guidelines..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-rule">
                <button type="button" onClick={() => setTaskModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-ink/60 hover:text-ink">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs">
                  {submitting ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {rosterModalDept && (
        <DepartmentTeamRosterModal
          dept={rosterModalDept}
          eventId={eventId}
          eventUsers={team}
          canManage={role.canManageDepartments || role.level === 'dept_head'}
          onClose={() => setRosterModalDept(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  )
}

export default function Departments() {
  return <RequireActiveEvent>{(eventId) => <DepartmentsContent eventId={eventId} />}</RequireActiveEvent>
}
