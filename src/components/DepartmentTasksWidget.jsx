import { useEffect, useState } from 'react'
import * as tasksApi from '../api/tasks'
import { useToast } from '../context/ToastContext'

export default function DepartmentTasksWidget({ eventId }) {
  const toast = useToast()
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)

  const loadSummary = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const data = await tasksApi.getTasksSummary(eventId)
      setSummary(data)
    } catch (err) {
      setSummary([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [eventId])

  if (loading) {
    return <div className="skeleton h-48 rounded-xl" />
  }

  if (!summary || summary.length === 0) {
    return (
      <div className="bg-card border border-rule rounded-xl p-5">
        <h3 className="font-display font-semibold text-ink mb-2">📋 Department Work & Task Status</h3>
        <p className="text-xs text-ink/50">No department tasks assigned yet.</p>
      </div>
    )
  }

  return (
    <div className="lift bg-card border border-rule rounded-xl p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-ink text-base flex items-center gap-2">
          📋 Department Heads Work & Task Status
        </h3>
        <span className="text-[11px] font-bold text-ink/50 bg-well px-2.5 py-1 rounded-full">
          {summary.length} Department{summary.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((dept) => {
          const total = Number(dept.total_given || 0)
          const completed = Number(dept.total_completed || 0)
          const pending = Number(dept.total_pending || 0)
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0

          return (
            <div key={dept.dept_id} className="p-3.5 bg-well/40 border border-rule rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: dept.dept_color || '#6366f1' }} />
                  <span className="font-bold text-sm text-ink">{dept.dept_name}</span>
                </div>
                <span className="text-xs text-ink/60 font-medium">
                  {dept.head_name ? `👤 Head: ${dept.head_name}` : '⚠️ Head Unassigned'}
                </span>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-card p-1.5 rounded-lg border border-rule">
                  <span className="text-[10px] font-bold text-ink/50 block">GIVEN</span>
                  <span className="text-xs font-bold text-ink">{total}</span>
                </div>
                <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-400 block">COMPLETED</span>
                  <span className="text-xs font-bold text-emerald-400">{completed}</span>
                </div>
                <div className="bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-400 block">NOT DONE</span>
                  <span className="text-xs font-bold text-amber-400">{pending}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-ink/60 font-semibold mb-1">
                  <span>Work Completion</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-well rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
