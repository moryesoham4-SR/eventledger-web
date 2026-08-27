import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveEvent } from '../context/EventContext'
import * as notificationsApi from '../api/notifications'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function Notifications() {
  const toast = useToast()
  const { activeEventId } = useActiveEvent()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const data = await notificationsApi.listNotifications()
      setItems(data)
    } catch {
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleGenerateAlerts = async () => {
    if (!activeEventId) {
      toast.error('Please select an active event first.')
      return
    }
    setGenerating(true)
    try {
      const res = await notificationsApi.generateAlerts(activeEventId)
      toast.success(res.new_alerts > 0 ? `Generated ${res.new_alerts} new real-time alert(s)!` : 'All budget & deadline alerts are up to date.')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not evaluate alerts.'))
    } finally {
      setGenerating(false)
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't mark that as read"))
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      load()
      toast.success('All caught up')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't mark all as read"))
    }
  }

  const filteredItems = items.filter((n) => {
    if (categoryFilter === 'overrun') return n.category === 'overrun' || (n.message && (n.message.includes('OVERRUN') || n.message.includes('BUDGET')))
    if (categoryFilter === 'deadline') return n.category === 'deadline' || (n.message && n.message.includes('VENDOR'))
    if (categoryFilter === 'expense') return n.category === 'expense' || (n.message && n.message.includes('EXPENSE'))
    return true
  })

  const getPriorityBadge = (n) => {
    const priority = n.priority || (n.message?.includes('CRITICAL') ? 'critical' : n.message?.includes('WARNING') ? 'warning' : 'info')
    if (priority === 'critical') {
      return <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded bg-deficit-500/20 text-deficit-400 border border-deficit-500/30">🚨 Critical</span>
    }
    if (priority === 'warning') {
      return <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">⚠️ Warning</span>
    }
    return <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded bg-primary-500/20 text-primary-400 border border-primary-500/30">ℹ️ Info</span>
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-2xl font-semibold text-ink">Notifications & Overrun Alerts</h2>
            {items.filter(n => !n.is_read).length > 0 && (
              <span className="bg-deficit-500 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full animate-pulse shadow-xs">
                {items.filter(n => !n.is_read).length} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-ink/60 mt-0.5">Real-time alerts for budget thresholds, vendor deadlines, and approvals.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAlerts}
            disabled={generating}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {generating ? 'Scanning…' : '⚡ Scan for Overruns & Deadlines'}
          </button>
          <button onClick={handleMarkAllRead} className="text-xs text-ink/60 hover:text-ink font-semibold px-3 py-2 border border-rule rounded-xl bg-card">
            Mark all read
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'overrun', label: '🚨 Overruns' },
          { key: 'deadline', label: '⏰ Deadlines' },
          { key: 'expense', label: '💸 Expenses' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategoryFilter(tab.key)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-all ${
              categoryFilter === tab.key
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-card text-ink/70 border-rule hover:text-ink hover:border-ink/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 text-sm text-deficit-600 bg-deficit-50 rounded-lg px-3 py-2.5">{error}</div>}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-2xl p-10 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-sm font-semibold text-ink">All Clear — No active alerts!</p>
          <p className="text-xs text-ink/50 mt-1">Your event budgets and vendor payments are operating normally.</p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-2xl divide-y divide-rule overflow-hidden shadow-xs">
          {filteredItems.map((n) => (
            <div key={n.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 ${!n.is_read ? 'bg-primary-500/5' : ''}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(n)}
                  <span className="text-[11px] text-ink/40 font-mono">{n.created_at || 'Just now'}</span>
                </div>
                <p className="text-sm text-ink font-medium leading-snug">{n.message || n.title || 'Notification'}</p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {n.action_url && (
                  <Link
                    to={n.action_url}
                    className="text-xs font-semibold text-primary-500 hover:text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20"
                  >
                    View Details →
                  </Link>
                )}
                {!n.is_read && (
                  <button onClick={() => handleMarkRead(n.id)} className="text-xs text-ink/50 hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-well">
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
