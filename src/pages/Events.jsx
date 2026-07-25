import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as eventsApi from '../api/events'
import { useActiveEvent } from '../context/EventContext'

const EMPTY_FORM = {
  name: '',
  venue: '',
  start_date: '',
  end_date: '',
  expected_attendees: '',
  currency: 'INR',
}

export default function Events() {
  const { refreshEvents } = useActiveEvent()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
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
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create event')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this event? This cannot be undone.')) return
    await eventsApi.deleteEvent(id)
    loadEvents()
    refreshEvents()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Events</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700"
        >
          {showForm ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Event name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
              />
            </div>
            <input
              type="number"
              min="0"
              placeholder="Expected attendees"
              value={form.expected_attendees}
              onChange={(e) => setForm({ ...form, expected_attendees: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium">
            Create Event
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="text-gray-500 text-sm">No events yet. Create your first one above.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <Link to={`/events/${ev.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                  {ev.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {[ev.start_date, ev.venue].filter(Boolean).join(' · ') || 'No date or venue set'}
                  {ev.status && (
                    <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase text-[10px] tracking-wide">
                      {ev.status}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link to={`/events/${ev.id}`} className="text-xs text-primary-600 hover:text-primary-700">
                  View
                </Link>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
