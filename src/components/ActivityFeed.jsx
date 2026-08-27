import { useEffect, useState } from 'react'
import * as activityApi from '../api/activity'

const ACTION_ICONS = {
  budget_submitted: '📤',
  budget_approved: '✅',
  budget_rejected: '❌',
  event_imported: '📥',
  budget_imported: '📥',
  event_status_changed: '🔄',
  task_assigned: '📋',
  task_updated: '🎯',
  task_completed: '🎉',
}

// The backend always works in UTC (datetime.utcnow() in Python, and
// activity_log.created_at is a naive Postgres TIMESTAMP on a UTC-timezone
// DB) but returns it as a bare ISO string with no 'Z' or offset — e.g.
// "2026-08-25T11:35:22". `new Date(...)` treats a string like that as
// LOCAL time, not UTC, so without this it displays hours off depending on
// the viewer's timezone. If the string has no timezone marker, treat it as UTC.
function toUtcDate(iso) {
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(iso)
  return new Date(hasTz ? iso : `${iso}Z`)
}

function formatWhen(iso) {
  if (!iso) return ''
  const d = toUtcDate(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function ActivityFeed({ eventId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    setLoading(true)
    activityApi
      .listActivity(eventId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load activity')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  return (
    <div className="lift bg-card border border-rule rounded-xl p-5">
      <h3 className="font-display font-semibold text-ink mb-3">Recent Activity</h3>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 skeleton rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-deficit-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink/50">Nothing logged yet — actions like budget approvals and imports will show up here.</p>
      ) : (
        <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">{ACTION_ICONS[a.action] || '•'}</span>
              <div className="min-w-0">
                <p className="text-sm text-ink/85 leading-snug">{a.description}</p>
                <p className="text-xs text-ink/40 mt-0.5">
                  {a.user_name ? `${a.user_name} · ` : ''}
                  {formatWhen(a.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
