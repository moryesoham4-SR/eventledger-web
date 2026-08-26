import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as eventsApi from '../api/events'
import { useActiveEvent } from '../context/EventContext'
import { useAuth } from '../context/AuthContext'
import StampBadge from '../components/StampBadge'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

const EMPTY_FORM = {
  name: '',
  venue: '',
  start_date: '',
  end_date: '',
  expected_attendees: '',
  currency: 'INR',
}

export default function Events() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const { refreshEvents } = useActiveEvent()
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await eventsApi.listEvents()
      setEvents(data)
    } catch (err) {
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (ev.name && ev.name.toLowerCase().includes(q)) ||
      (ev.venue && ev.venue.toLowerCase().includes(q)) ||
      (ev.currency && ev.currency.toLowerCase().includes(q)) ||
      (ev.status && ev.status.toLowerCase().includes(q))
    )
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await eventsApi.createEvent({
        ...form,
        expected_attendees: form.expected_attendees ? Number(form.expected_attendees) : 0,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      loadEvents()
      refreshEvents()
      toast.success('Event created')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create event'))
    }
  }

  const handleDelete = async (id) => {
    if (!(await confirm('Delete this event? This cannot be undone.', { danger: true, confirmLabel: 'Delete' }))) return
    try {
      await eventsApi.deleteEvent(id)
      loadEvents()
      refreshEvents()
      toast.success('Event deleted')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete event'))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-display text-2xl font-semibold text-ink">Events</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-well border border-rule rounded-full px-3.5 py-1.5 pl-8 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-primary-500 w-44 sm:w-56 transition-all"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
        >
          {showForm ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-deficit-500 bg-deficit-50 rounded px-3 py-2">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-rule rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Event name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            />
            <div>
              <label className="block text-xs text-ink/55 mb-1">Start date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="bg-well border border-rule rounded px-3 py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/55 mb-1">End date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="bg-well border border-rule rounded px-3 py-2 text-sm w-full"
              />
            </div>
            <input
              type="number"
              min="0"
              placeholder="Expected attendees"
              value={form.expected_attendees}
              onChange={(e) => setForm({ ...form, expected_attendees: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            />
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">
            Create Event
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-ink/55 text-sm">Loading events...</p>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-ink/60">
            {searchQuery ? `No events matching "${searchQuery}"` : 'No events yet. Create your first one above.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-xl divide-y divide-rule">
          {filteredEvents.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <div className="flex items-center gap-3">
                {ev.status && <StampBadge status={ev.status} size="xs" />}
                <div>
                  <Link to={`/events/${ev.id}`} className="font-medium text-ink hover:text-primary-500">
                    {ev.name}
                  </Link>
                  <p className="text-xs text-ink/55">
                    {[ev.start_date, ev.venue].filter(Boolean).join(' · ') || 'No date or venue set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link to={`/events/${ev.id}`} className="text-xs text-primary-500 hover:text-primary-400">
                  View
                </Link>
                {(user?.is_super_admin || ev.user_id === user?.id) && (
                  <button
                    onClick={() => handleDelete(ev.id)}
                    className="text-xs text-deficit-500 hover:text-deficit-600"
                  >
                    Delete
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
