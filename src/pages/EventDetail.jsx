import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as eventsApi from '../api/events'
import * as departmentsApi from '../api/departments'
import StatCard from '../components/StatCard'
import { useActiveEvent } from '../context/EventContext'

const SECTIONS = [
  { path: '/budget', label: 'Budget Proposals' },
  { path: '/expenses', label: 'Expenses' },
  { path: '/income', label: 'Income' },
  { path: '/vendors', label: 'Vendors' },
  { path: '/sponsors', label: 'Sponsors' },
]

export default function EventDetail() {
  const { id } = useParams()
  const { activeEventId, setActiveEventId } = useActiveEvent()
  const [event, setEvent] = useState(null)
  const [summary, setSummary] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [ev, sum, depts] = await Promise.all([
        eventsApi.getEvent(id),
        eventsApi.getEventSummary(id),
        departmentsApi.listDepartments(id),
      ])
      setEvent(ev)
      setSummary(sum)
      setDepartments(depts)
    } catch (err) {
      setError('Failed to load event details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>
  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!event) return null

  const isActive = String(activeEventId) === String(id)
  const currency = event.currency || 'INR'

  return (
    <div>
      <Link to="/events" className="text-sm text-primary-600 mb-4 inline-block">
        ← Back to Events
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{event.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {[event.venue, event.start_date, event.status, event.phase].filter(Boolean).join(' · ')}
          </p>
        </div>
        {!isActive ? (
          <button
            onClick={() => setActiveEventId(String(id))}
            className="text-sm border border-primary-600 text-primary-600 px-3 py-1.5 rounded font-medium hover:bg-primary-50"
          >
            Set as active event
          </button>
        ) : (
          <span className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded font-medium">
            Active event
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Estimated Income" value={summary.est_income} currency={currency} />
        <StatCard label="Actual Income" value={summary.act_income} currency={currency} tone="positive" />
        <StatCard label="Estimated Expense" value={summary.est_expense} currency={currency} />
        <StatCard label="Actual Expense" value={summary.act_expense} currency={currency} tone="negative" />
        <StatCard
          label="Profit"
          value={summary.profit}
          currency={currency}
          tone={summary.profit >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Variance vs Budget"
          value={summary.variance}
          currency={currency}
          tone={summary.variance >= 0 ? 'positive' : 'negative'}
          hint="Estimated expense minus actual"
        />
        <StatCard label="Budget Utilization" value={`${summary.budget_utilization}%`} />
        <StatCard label="Expected Attendees" value={event.expected_attendees ?? '—'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Departments</h3>
          {departments.length === 0 ? (
            <p className="text-sm text-gray-500">
              No departments yet.{' '}
              <Link to="/departments" onClick={() => setActiveEventId(String(id))} className="text-primary-600">
                Add one
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {departments.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: d.color || '#6366f1' }}
                  />
                  {d.name}
                  {d.head_name && <span className="text-gray-400">— {d.head_name}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Manage this event</h3>
          <p className="text-xs text-gray-500 mb-3">
            Set this as your active event, then jump into any section below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SECTIONS.map((s) => (
              <Link
                key={s.path}
                to={s.path}
                onClick={() => setActiveEventId(String(id))}
                className="text-sm border border-gray-200 rounded px-3 py-2 text-gray-700 hover:border-primary-400 hover:text-primary-600"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
