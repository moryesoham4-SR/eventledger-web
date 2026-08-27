import { useEffect, useState } from 'react'
import RequireActiveEvent from '../components/RequireActiveEvent'
import * as eventsApi from '../api/events'
import * as tasksApi from '../api/tasks'
import * as departmentsApi from '../api/departments'
import * as usersApi from '../api/users'
import * as vendorsApi from '../api/vendors'
import { useToast } from '../context/ToastContext'
import { useMyRole } from '../hooks/useMyRole'
import { getErrorMessage } from '../api/client'

function CalendarContent({ eventId }) {
  const toast = useToast()
  const role = useMyRole(eventId)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [event, setEvent] = useState(null)
  const [tasks, setTasks] = useState([])
  const [departments, setDepartments] = useState([])
  const [team, setTeam] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedDay, setSelectedDay] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Task creation form modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDeptId, setTaskDeptId] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState('')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDesc, setTaskDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadAllData = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const [evData, tasksList, deptsList, teamList, vendorsList] = await Promise.all([
        eventsApi.getEvent(eventId).catch(() => null),
        tasksApi.listTasks(eventId).catch(() => []),
        departmentsApi.listDepartments(eventId).catch(() => []),
        usersApi.getEventTeam(eventId).catch(() => []),
        vendorsApi.listVendors(eventId).catch(() => []),
      ])
      setEvent(evData)
      setTasks(tasksList)
      setDepartments(deptsList)
      setTeam(teamList)
      setVendors(vendorsList)
    } catch (err) {
      toast.error('Failed to load calendar data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [eventId])

  // Calendar math
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const todayMonth = () => setCurrentDate(new Date())

  // Helper date formatter YYYY-MM-DD
  const formatDateStr = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!taskTitle || !taskDeptId) {
      toast.error('Please fill in title and department')
      return
    }
    setSubmitting(true)
    try {
      const assignedUser = team.find((m) => String(m.id) === String(taskAssigneeId))
      await tasksApi.createTask({
        event_id: Number(eventId),
        department_id: Number(taskDeptId),
        assigned_to_user_id: taskAssigneeId ? Number(taskAssigneeId) : null,
        assigned_to_name: assignedUser ? (assignedUser.name || assignedUser.email) : null,
        title: taskTitle,
        description: taskDesc,
        deadline: taskDeadline,
        priority: taskPriority,
        status: 'pending',
      })
      toast.success('Work task assigned successfully! 📋')
      setTaskModalOpen(false)
      setTaskTitle('')
      setTaskDesc('')
      setTaskDeadline('')
      setTaskPriority('medium')
      loadAllData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to assign work task.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed'
    try {
      await tasksApi.updateTask(task.id, { status: nextStatus })
      toast.success(`Task status updated to "${nextStatus.replace('_', ' ')}"`)
      loadAllData()
    } catch (err) {
      toast.error('Failed to update task status')
    }
  }

  // Filter tasks for a given day
  const getItemsForDay = (dateStr) => {
    const dayTasks = tasks.filter((t) => t.deadline === dateStr)
    const dayVendors = vendors.filter((v) => v.status === 'pending') // could have deadlines
    const isEventStart = event?.start_date === dateStr
    const isEventEnd = event?.end_date === dateStr
    return { dayTasks, dayVendors, isEventStart, isEventEnd }
  }

  const daysGrid = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    daysGrid.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d)
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink flex items-center gap-2">
            📅 Event Calendar & Work Deadlines
          </h2>
          <p className="text-sm text-ink/55 mt-0.5">
            Track department task deadlines, event milestones, and team member assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTaskModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
          >
            <span>+</span> Assign Work Task
          </button>
        </div>
      </div>

      {/* Month Navigation Header */}
      <div className="bg-card border border-rule rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-xl font-bold text-ink">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={todayMonth}
            className="text-xs font-semibold px-3 py-1 border border-rule rounded-full bg-well/60 hover:bg-well text-ink transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-2 border border-rule rounded-lg hover:bg-well text-ink/70 hover:text-ink font-bold transition-all"
          >
            ← Prev
          </button>
          <button
            onClick={nextMonth}
            className="p-2 border border-rule rounded-lg hover:bg-well text-ink/70 hover:text-ink font-bold transition-all"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="skeleton h-96 rounded-2xl" />
      ) : (
        <div className="bg-card border border-rule rounded-2xl overflow-hidden shadow-sm">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-rule bg-well/50 text-center py-2.5 text-xs font-bold text-ink/60 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-rule bg-card">
            {daysGrid.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`empty-${idx}`} className="bg-well/20 min-h-[110px]" />
              }

              const dateStr = formatDateStr(year, month, dayNum)
              const { dayTasks, isEventStart, isEventEnd } = getItemsForDay(dateStr)
              const isToday =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === dayNum

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => {
                    setSelectedDay({ dateStr, dayNum, dayTasks, isEventStart, isEventEnd })
                    setModalOpen(true)
                  }}
                  className={`min-h-[110px] p-2 hover:bg-well/40 transition-colors cursor-pointer flex flex-col justify-between ${
                    isToday ? 'bg-primary-500/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-primary-500 text-white shadow-xs'
                          : 'text-ink/80'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-extrabold bg-primary-500/20 text-primary-400 px-1.5 py-0.2 rounded-full">
                        {dayTasks.length} task{dayTasks.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  {/* Day Badges */}
                  <div className="space-y-1 overflow-hidden flex-1">
                    {isEventStart && (
                      <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 truncate">
                        🎓 Event Starts
                      </div>
                    )}
                    {isEventEnd && (
                      <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 truncate">
                        🏁 Event Ends
                      </div>
                    )}
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border truncate flex items-center justify-between ${
                          t.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 line-through opacity-60'
                            : t.priority === 'urgent' || t.priority === 'high'
                            ? 'bg-deficit-500/15 text-deficit-400 border-deficit-500/30'
                            : 'bg-primary-500/10 text-primary-300 border-primary-500/20'
                        }`}
                      >
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[9px] text-ink/50 font-semibold block text-right">
                        +{dayTasks.length - 2} more…
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Day Breakdown Modal */}
      {modalOpen && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-5 border-b border-rule flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  📅 Schedule for {monthNames[month]} {selectedDay.dayNum}, {year}
                </h3>
                <p className="text-xs text-ink/60">{selectedDay.dateStr}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-ink/40 hover:text-ink text-xl font-bold px-2">✕</button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedDay.isEventStart && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold">
                  🎓 Official Start Date of Event "{event?.name}"
                </div>
              )}
              {selectedDay.isEventEnd && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold">
                  🏁 Official End Date of Event "{event?.name}"
                </div>
              )}

              {selectedDay.dayTasks.length === 0 ? (
                <p className="text-xs text-ink/50 py-4 text-center">No work tasks or deadlines scheduled for this date.</p>
              ) : (
                <div className="space-y-3">
                  {selectedDay.dayTasks.map((t) => (
                    <div key={t.id} className="p-3.5 bg-well/50 border border-rule rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-ink">{t.title}</span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                              style={{ backgroundColor: t.dept_color || '#3B82F6' }}
                            >
                              {t.dept_name}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
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
                          {t.description && <p className="text-xs text-ink/60 mt-1">{t.description}</p>}
                          <p className="text-xs text-ink/50 mt-1">
                            👤 Assigned to: <strong className="text-ink/80">{t.assignee_name || t.assigned_to_name || 'Unassigned'}</strong>
                          </p>
                        </div>

                        <button
                          onClick={() => handleToggleTaskStatus(t)}
                          className="text-xs font-semibold px-2.5 py-1 border border-rule rounded-lg bg-card hover:bg-well text-ink transition-colors whitespace-nowrap"
                        >
                          {t.status === 'completed' ? 'Mark Pending' : 'Mark Complete ✓'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-rule bg-well/30 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="text-xs font-semibold px-4 py-2 border border-rule rounded-xl bg-card text-ink hover:border-ink/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-5 border-b border-rule flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">📋 Assign New Department Work Task</h3>
              <button onClick={() => setTaskModalOpen(false)} className="text-ink/40 hover:text-ink text-xl font-bold px-2">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Work Title / Task Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Event Banner & Flyers"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink/70 mb-1">Department *</label>
                  <select
                    required
                    value={taskDeptId}
                    onChange={(e) => setTaskDeptId(e.target.value)}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                  >
                    <option value="">Select department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/70 mb-1">Assign to Team Member</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                  >
                    <option value="">Select team member...</option>
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email} ({m.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink/70 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/70 mb-1">Priority Level</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Work Description / Deliverable Notes</label>
                <textarea
                  rows={3}
                  placeholder="Specific requirements, links, or deliverables for this task..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div className="p-4 border-t border-rule bg-well/30 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="text-xs font-semibold px-4 py-2 border border-rule rounded-xl bg-card text-ink hover:border-ink/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                >
                  {submitting ? 'Assigning…' : '✉️ Assign Work Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CalendarPage() {
  return <RequireActiveEvent>{(eventId) => <CalendarContent eventId={eventId} />}</RequireActiveEvent>
}
