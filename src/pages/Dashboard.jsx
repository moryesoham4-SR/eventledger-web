import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as eventsApi from '../api/events'
import StatCard from '../components/StatCard'
import { useActiveEvent } from '../context/EventContext'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const { events, activeEventId, loading: eventsLoading } = useActiveEvent()
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState('')

  const activeEvent = events.find((e) => String(e.id) === String(activeEventId))

  useEffect(() => {
    if (!activeEventId) {
      setSummary(null)
      return
    }
    setSummaryLoading(true)
    setError('')
    eventsApi
      .getEventSummary(activeEventId)
      .then(setSummary)
      .catch(() => setError('Failed to load summary for the active event'))
      .finally(() => setSummaryLoading(false))
  }, [activeEventId])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome{user?.name ? `, ${user.name}` : ''}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {user?.org_name ? `${user.org_name} · ` : ''}Here's how your active event is tracking.
      </p>

      {eventsLoading ? (
        <p className="text-gray-500 text-sm">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">You don't have any events yet.</p>
          <Link
            to="/events"
            className="inline-block bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700"
          >
            Create your first event
          </Link>
        </div>
      ) : !activeEvent ? (
        <p className="text-gray-500 text-sm">
          Select an active event from the sidebar to see its summary.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{activeEvent.name}</h3>
            <Link to={`/events/${activeEvent.id}`} className="text-sm text-primary-600 hover:text-primary-700">
              View full event →
            </Link>
          </div>

          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}

          {summaryLoading || !summary ? (
            <p className="text-gray-500 text-sm">Loading summary...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Estimated Income" value={summary.est_income} currency={activeEvent.currency} />
              <StatCard label="Actual Income" value={summary.act_income} currency={activeEvent.currency} tone="positive" />
              <StatCard label="Estimated Expense" value={summary.est_expense} currency={activeEvent.currency} />
              <StatCard label="Actual Expense" value={summary.act_expense} currency={activeEvent.currency} tone="negative" />
              <StatCard
                label="Profit"
                value={summary.profit}
                currency={activeEvent.currency}
                tone={summary.profit >= 0 ? 'positive' : 'negative'}
              />
              <StatCard
                label="Variance vs Budget"
                value={summary.variance}
                currency={activeEvent.currency}
                tone={summary.variance >= 0 ? 'positive' : 'negative'}
              />
              <StatCard label="Budget Utilization" value={`${summary.budget_utilization}%`} />
              <StatCard label="Expected Attendees" value={activeEvent.expected_attendees ?? '—'} />
            </div>
          )}
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">All events</h3>
          <Link to="/events" className="text-sm text-primary-600 hover:text-primary-700">
            Manage events →
          </Link>
        </div>
        {events.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {events.map((ev) => (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">{ev.name}</span>
                <span className="text-xs text-gray-500">
                  {[ev.start_date, ev.venue].filter(Boolean).join(' · ')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
