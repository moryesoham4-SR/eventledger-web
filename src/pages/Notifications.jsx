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
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
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
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)))
    } catch {
      toast.error('Failed to mark read')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const getPriorityStyle = (prio) => {
    if (prio === 'urgent') return 'bg-deficit-500/15 text-deficit-500 border-deficit-500/30'
    if (prio === 'warning') return 'bg-warning-500/15 text-warning-500 border-warning-500/30'
    return 'bg-primary-500/15 text-primary-400 border-primary-500/30'
  }

  const getCategoryIcon = (cat) => {
    if (cat === 'budget_overrun') return '🚨'
    if (cat === 'budget_warning') return '⚠️'
    if (cat === 'vendor_payout') return '⏰'
    if (cat === 'high_proposal') return '💸'
    if (cat === 'task') return '📋'
    return '🔔'
  }

  const safeItems = Array.isArray(items) ? items : []
  const filteredItems = safeItems.filter((n) => {
    if (categoryFilter === 'all') return true
    if (categoryFilter === 'unread') return !n.is_read
    return n.category === categoryFilter
  })

  const unreadTotal = safeItems.filter((n) => !n.is_read).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink">Notifications & Alerts</h2>
            {unreadTotal > 0 && (
              <span className="bg-deficit-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unreadTotal} unread
              </span>
            )}
          </div>
          <p className="text-sm text-ink/55 mt-0.5">
            Automated alerts for budget limits, high proposals, and vendor deadlines
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerateAlerts}
            disabled={generating}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
          >
            {generating ? 'Scanning...' : '⚡ Evaluate Alerts'}
          </button>
          {unreadTotal > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="border border-rule text-ink/75 hover:border-primary-400 text-xs font-semibold px-3.5 py-2 rounded-full transition-all"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-rule pb-3 overflow-x-auto">
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: `Unread (${unreadTotal})` },
          { id: 'budget_overrun', label: '🚨 Overruns' },
          { id: 'budget_warning', label: '⚠️ Warnings' },
          { id: 'vendor_payout', label: '⏰ Vendor Payouts' },
          { id: 'high_proposal', label: '💸 High Proposals' },
          { id: 'task', label: '📋 Tasks' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              categoryFilter === tab.id
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                : 'text-ink/60 hover:text-ink hover:bg-well'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-deficit-600">{error}</p>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-rule rounded-xl p-10 text-center text-ink/50 text-sm">
          No notifications found in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((n) => (
            <div
              key={n.id}
              className={`lift bg-card border rounded-xl p-4 transition-all flex items-start justify-between gap-4 ${
                !n.is_read ? 'border-primary-500/40 bg-primary-500/5 shadow-xs' : 'border-rule'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xl shrink-0 mt-0.5">{getCategoryIcon(n.category)}</span>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-sm font-semibold ${!n.is_read ? 'text-ink font-bold' : 'text-ink/80'}`}>
                      {n.title || 'Notification'}
                    </h4>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityStyle(n.priority)}`}>
                      {n.priority || 'info'}
                    </span>
                  </div>
                  <p className="text-xs text-ink/70 leading-relaxed break-words">{n.message}</p>
                  <p className="text-[10px] text-ink/40">
                    {new Date(n.created_at).toLocaleString(undefined, {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.action_url && (
                  <Link
                    to={n.action_url}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className="text-xs font-semibold text-primary-500 hover:text-primary-400 px-2.5 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20"
                  >
                    View →
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-ink/50 hover:text-ink px-2 py-1"
                    title="Mark as read"
                  >
                    ✓ Read
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
