import { useEffect, useState } from 'react'
import RequireActiveEvent from '../components/RequireActiveEvent'
import * as eventsApi from '../api/events'
import * as tasksApi from '../api/tasks'
import * as departmentsApi from '../api/departments'
import * as usersApi from '../api/users'
import * as vendorsApi from '../api/vendors'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useMyRole } from '../hooks/useMyRole'
import { getErrorMessage } from '../api/client'

function CalendarContent({ eventId }) {
  const toast = useToast()
  const { promptText, confirm } = useConfirm()
  const role = useMyRole(eventId)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [event, setEvent] = useState(null)
  const [tasks, setTasks] = useState([])
  const [auditReport, setAuditReport] = useState([])
  const [departments, setDepartments] = useState([])
  const [team, setTeam] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedDay, setSelectedDay] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [demeritModalOpen, setDemeritModalOpen] = useState(false)

  // Task creation form modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDeptId, setTaskDeptId] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState('')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDesc, setTaskDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Demerit penalty form state
  const [demeritDeptId, setDemeritDeptId] = useState('')
  const [demeritPointsVal, setDemeritPointsVal] = useState(1)
  const [demeritReason, setDemeritReason] = useState('')
  const [penalizing, setPenalizing] = useState(false)

  const loadAllData = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const [evData, tasksList, auditList, deptsList, teamList, vendorsList] = await Promise.all([
        eventsApi.getEvent(eventId).catch(() => null),
        tasksApi.listTasks(eventId).catch(() => []),
        tasksApi.getTaskAuditReport(eventId).catch(() => []),
        departmentsApi.listDepartments(eventId).catch(() => []),
        usersApi.getEventTeam(eventId).catch(() => []),
        vendorsApi.listVendors(eventId).catch(() => []),
      ])
      setEvent(evData)
      setTasks(tasksList)
      setAuditReport(auditList)
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

  const handleStatusChangeWithReason = async (task, targetStatus) => {
    const isOverdue = task.deadline && task.deadline < new Date().toISOString().split('T')[0]
    let incomplete_reason = ''

    if (targetStatus === 'incomplete' || (isOverdue && targetStatus !== 'completed')) {
      const reasonInput = await promptText('Compulsory: Why was this work incomplete or delayed?', {
        title: 'Task Delay / Incomplete Explanation',
        placeholder: 'e.g. Vendor delayed material delivery by 2 days',
        confirmLabel: 'Submit Explanation',
        danger: true,
      })
      if (reasonInput === null) return
      if (!reasonInput.trim()) {
        toast.error('A written explanation for delayed or incomplete work is compulsory!')
        return
      }
      incomplete_reason = reasonInput.trim()
    }

    try {
      await tasksApi.updateTask(task.id, {
        status: targetStatus,
        incomplete_reason: incomplete_reason || undefined,
      })
      toast.success(`Task status updated to "${targetStatus.replace('_', ' ')}"`)
      loadAllData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update task status'))
    }
  }

  const handleApplyDemerit = async (e) => {
    e.preventDefault()
    if (!demeritDeptId || !demeritReason.trim()) {
      toast.error('Please select a department and enter a compulsory penalty reason')
      return
    }
    setPenalizing(true)
    try {
      await departmentsApi.penalizeDepartmentDemerits(Number(demeritDeptId), {
        demerit_points: Number(demeritPointsVal) || 1,
        reason: demeritReason.trim(),
      })
      toast.success(`Assigned ${demeritPointsVal} Demerit Point(s) to Department! ⚠️`)
      setDemeritModalOpen(false)
      setDemeritReason('')
      loadAllData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to penalize department demerit points'))
    } finally {
      setPenalizing(false)
    }
  }

  // Filter tasks for a given day
  const getItemsForDay = (dateStr) => {
    const dayTasks = tasks.filter((t) => t.deadline === dateStr)
    const dayVendors = vendors.filter((v) => v.status === 'pending')
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

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink flex items-center gap-3">
            <span>📅 Event Calendar & Task Audit</span>
            {pendingTasksCount > 0 && (
              <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                {pendingTasksCount} Pending Task{pendingTasksCount === 1 ? '' : 's'}
              </span>
            )}
          </h2>
          <p className="text-sm text-ink/55 mt-0.5">
            Track department task deadlines, compulsory delay reasons, demerit points, and audit compliance.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAuditModalOpen(true)}
            className="border border-primary-500/40 text-primary-400 hover:bg-primary-500/10 text-xs font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs"
          >
            📋 Task Audit Report
          </button>
          {(role.canManageWorkTasks || role.is_super_admin) && (
            <>
              <button
                onClick={() => setDemeritModalOpen(true)}
                className="border border-deficit-500/40 text-deficit-400 hover:bg-deficit-500/10 text-xs font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs"
              >
                ⚠️ Penalize Demerit Points
              </button>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
              >
                <span>+</span> Assign Work Task
              </button>
            </>
          )}
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
                            : t.status === 'incomplete'
                            ? 'bg-deficit-500/20 text-deficit-400 border-deficit-500/40'
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
                                  : t.status === 'incomplete'
                                  ? 'bg-deficit-500/20 text-deficit-400'
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
                          {t.incomplete_reason && (
                            <p className="text-xs text-deficit-400 font-medium mt-1 bg-deficit-500/10 p-2 rounded border border-deficit-500/30">
                              ⚠️ Delay Explanation: {t.incomplete_reason}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 text-right">
                          {t.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusChangeWithReason(t, 'completed')}
                              className="text-[11px] font-semibold px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors whitespace-nowrap"
                            >
                              Mark Complete ✓
                            </button>
                          )}
                          {t.status !== 'incomplete' && (
                            <button
                              onClick={() => handleStatusChangeWithReason(t, 'incomplete')}
                              className="text-[11px] font-semibold px-2.5 py-1 border border-deficit-500/30 text-deficit-400 hover:bg-deficit-500/10 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Mark Incomplete ❌
                            </button>
                          )}
                        </div>
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

      {/* Demerit Penalty Modal */}
      {demeritModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-rule flex items-center justify-between bg-deficit-500/10">
              <h3 className="font-display text-lg font-bold text-deficit-400 flex items-center gap-2">
                ⚠️ Issue Department Demerit Points
              </h3>
              <button onClick={() => setDemeritModalOpen(false)} className="text-ink/40 hover:text-ink text-xl font-bold px-2">✕</button>
            </div>

            <form onSubmit={handleApplyDemerit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Target Department *</label>
                <select
                  required
                  value={demeritDeptId}
                  onChange={(e) => setDemeritDeptId(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-deficit-500"
                >
                  <option value="">Select department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Demerit Points Penalty *</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={demeritPointsVal}
                  onChange={(e) => setDemeritPointsVal(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-deficit-500 font-bold"
                />
                <p className="text-[11px] text-ink/50 mt-1">Each demerit point reduces department Efficiency XP score by 5 XP.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Compulsory Penalty Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Failed to submit stage design deliverables on deadline date..."
                  value={demeritReason}
                  onChange={(e) => setDemeritReason(e.target.value)}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-deficit-500"
                />
              </div>

              <div className="p-4 border-t border-rule bg-well/30 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setDemeritModalOpen(false)}
                  className="text-xs font-semibold px-4 py-2 border border-rule rounded-xl bg-card text-ink hover:border-ink/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={penalizing}
                  className="bg-deficit-600 hover:bg-deficit-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                >
                  {penalizing ? 'Penalizing…' : '⚠️ Confirm Demerit Penalty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Audit Report Modal */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-rule flex items-center justify-between bg-well/40">
              <div>
                <h3 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                  📋 Task Performance & Audit Compliance Report
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  Complete tracking log of task assignments, assigners, deadlines, completion times, delay explanations, and penalties.
                </p>
              </div>
              <button onClick={() => setAuditModalOpen(false)} className="text-ink/40 hover:text-ink text-xl font-bold px-2">✕</button>
            </div>

            <div className="p-5 overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-rule bg-well/60 text-ink/70 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Task Name</th>
                    <th className="py-2.5 px-3">Assigned By</th>
                    <th className="py-2.5 px-3">Assigned To</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Deadline</th>
                    <th className="py-2.5 px-3">Completed At</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Delay / Incomplete Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule text-ink">
                  {auditReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-ink/40">
                        No task audit records found.
                      </td>
                    </tr>
                  ) : (
                    auditReport.map((row) => (
                      <tr key={row.id} className="hover:bg-well/30 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-ink">{row.title}</p>
                          {row.description && <p className="text-[11px] text-ink/50 truncate max-w-xs">{row.description}</p>}
                        </td>
                        <td className="py-3 px-3 font-medium text-ink/80">{row.assigner_label}</td>
                        <td className="py-3 px-3 font-semibold text-primary-400">{row.assignee_label}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: row.dept_color || '#6366f1' }}>
                            {row.dept_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium">{row.deadline || '-'}</td>
                        <td className="py-3 px-3 text-ink/70">{row.completed_at ? new Date(row.completed_at).toLocaleString() : '-'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            row.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            row.status === 'incomplete' ? 'bg-deficit-500/20 text-deficit-400' :
                            row.is_overdue ? 'bg-amber-500/20 text-amber-400' : 'bg-ink/10 text-ink/70'
                          }`}>
                            {row.is_overdue ? '⚠️ Overdue' : row.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          {row.incomplete_reason ? (
                            <span className="text-deficit-400 text-[11px] font-medium bg-deficit-500/10 px-2 py-1 rounded block border border-deficit-500/20">
                              {row.incomplete_reason}
                            </span>
                          ) : (
                            <span className="text-ink/30">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-rule bg-well/30 flex justify-end">
              <button
                onClick={() => setAuditModalOpen(false)}
                className="text-xs font-semibold px-4 py-2 border border-rule rounded-xl bg-card text-ink hover:border-ink/30"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CalendarPage() {
  return <RequireActiveEvent>{(eventId) => <CalendarContent eventId={eventId} />}</RequireActiveEvent>
}
