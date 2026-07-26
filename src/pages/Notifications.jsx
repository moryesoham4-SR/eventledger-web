import { useEffect, useState } from 'react'
import * as notificationsApi from '../api/notifications'

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const handleMarkRead = async (id) => {
    await notificationsApi.markRead(id)
    load()
  }

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-semibold text-ink">Notifications</h2>
        <button onClick={handleMarkAllRead} className="text-sm text-primary-600 hover:text-primary-700 font-semibold">
          Mark all as read
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-deficit-600 bg-deficit-50 rounded-lg px-3 py-2.5">{error}</div>}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 bg-white border border-rule rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm text-ink/60">You're all caught up — nothing new.</p>
        </div>
      ) : (
        <div className="bg-white border border-rule rounded-xl divide-y divide-rule">
          {items.map((n) => (
            <div key={n.id} className={`flex items-start justify-between px-5 py-3 ${!n.is_read ? 'bg-primary-50/40' : ''}`}>
              <div>
                <p className="text-sm text-ink">{n.message || n.title || 'Notification'}</p>
                <p className="text-xs text-ink/40 mt-0.5">{n.created_at}</p>
              </div>
              {!n.is_read && (
                <button onClick={() => handleMarkRead(n.id)} className="text-xs text-primary-600 hover:text-primary-700 whitespace-nowrap ml-4">
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
