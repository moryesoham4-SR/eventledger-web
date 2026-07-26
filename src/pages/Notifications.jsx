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
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        <button onClick={handleMarkAllRead} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Mark all as read
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">You're all caught up — no notifications.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {items.map((n) => (
            <div key={n.id} className={`flex items-start justify-between px-5 py-3 ${!n.is_read ? 'bg-primary-50/40' : ''}`}>
              <div>
                <p className="text-sm text-gray-900">{n.message || n.title || 'Notification'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{n.created_at}</p>
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
