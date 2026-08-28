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
      setEvents(Array.isArray(data) ? data : [])
    } catch (err) {
      setEvents([])
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const safeEvents = Array.isArray(events) ? events : []
  const filteredEvents = safeEvents.filter((ev) => {
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
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error('Event name, start date, and end date are required.')
      return
    }
    try {
      await eventsApi.createEvent({
        ...form,
        expected_attendees: form.expected_attendees ? Number(form.expected_attendees) : null,
      })
      toast.success(`Event "${form.name}" created! 🚀`)
      setForm(EMPTY_FORM)
      setShowForm(false)
      loadEvents()
      refreshEvents()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create event.'))
    }
  }

  const handleDelete = async (ev) => {
    if (!(await confirm(`Are you sure you want to delete "${ev.name}"? This action cannot be undone.`, { danger: true, confirmLabel: 'Delete Event' }))) return
    try {
      await eventsApi.deleteEvent(ev.id)
      toast.success(`Event "${ev.name}" deleted.`)
      loadEvents()
      refreshEvents()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete event.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Events</h2>
          <p className="text-sm text-ink/55">Manage all events under your account</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-full text-sm shadow-xs transition-all active:scale-95"
        >
          {showForm ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-rule rounded-xl p-5 space-y-4 animate-fade-in shadow-sm">
          <h3 className="font-display font-semibold text-ink text-base">Create New Event</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1">Event Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Annual Tech Symposium 2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-well text-ink border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1">Venue / Platform</label>
              <input
                type="text"
                placeholder="e.g. Main Auditorium / Zoom"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                className="w-full bg-well text-ink border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full bg-well text-ink border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1">End Date *</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full bg-well text-ink border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1">Expected Attendees</label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={form.expected_attendees}
                onChange={(e) => setForm({ ...form, expected_attendees: e.target.value })}
                className="w-full bg-well text-ink border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full bg-well text-ink border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs font-semibold text-ink/60 px-4 py-2 rounded-full hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-5 py-2 rounded-full shadow-xs active:scale-95 transition-all"
            >
              Save Event
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search events by name, venue, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-sm bg-card text-ink border border-rule rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-deficit-600">{error}</p>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-card border border-rule rounded-xl p-8 text-center text-ink/50 text-sm">
          No events found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev) => (
            <div key={ev.id} className="lift bg-card border border-rule rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-display font-semibold text-ink text-base truncate">{ev.name}</h3>
                  {ev.status && <StampBadge status={ev.status} size="xs" />}
                </div>
                <p className="text-xs text-ink/55 line-clamp-2">
                  {[ev.venue, ev.start_date].filter(Boolean).join(' · ')}
                </p>
                {ev.expected_attendees && (
                  <p className="text-xs text-ink/40 mt-1">👥 {ev.expected_attendees} expected attendees</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-rule/60 text-xs">
                <Link
                  to={`/events/${ev.id}`}
                  className="font-semibold text-primary-500 hover:text-primary-400"
                >
                  View Details →
                </Link>
                {user?.is_super_admin && (
                  <button
                    onClick={() => handleDelete(ev)}
                    className="text-ink/40 hover:text-deficit-500 font-medium transition-colors"
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
