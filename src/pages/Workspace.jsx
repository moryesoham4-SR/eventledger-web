import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as eventsApi from '../api/events'
import * as notificationsApi from '../api/notifications'
import * as budgetApi from '../api/budget'
import StatCard, { formatMoney } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useActiveEvent } from '../context/EventContext'

// Small helper — days until (or since) a date, same convention as EventCountdown
function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

function healthFromSummary(summary) {
  if (!summary) return { status: 'Unknown', tone: 'neutral' }
  const util = summary.budget_utilization ?? 0
  if (summary.profit < 0 || util > 100) return { status: 'Over Budget', tone: 'negative' }
  if (util > 90) return { status: 'Tight', tone: 'warning' }
  return { status: 'Healthy', tone: 'positive' }
}

const TONE_DOT = {
  positive: 'bg-success-500',
  warning: 'bg-warning-500',
  negative: 'bg-deficit-500',
  neutral: 'bg-ink/30',
}

const TONE_TEXT = {
  positive: 'text-success-500',
  warning: 'text-warning-500',
  negative: 'text-deficit-500',
  neutral: 'text-ink/50',
}

export default function Workspace() {
  const { user } = useAuth()
  const { events, activeEventId, setActiveEventId, loading: eventsLoading } = useActiveEvent()

  const [summaries, setSummaries] = useState({}) // eventId -> summary
  const [pendingByEvent, setPendingByEvent] = useState({}) // eventId -> count
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    notificationsApi.getUnreadCount().then((d) => setUnreadCount(d.count)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!events.length) return
    let cancelled = false
    setLoading(true)

    Promise.all(
      events.map((ev) =>
        Promise.all([
          eventsApi.getEventSummary(ev.id).catch(() => null),
          budgetApi.listProposals(ev.id).catch(() => []),
        ]).then(([summary, proposals]) => ({
          id: ev.id,
          summary,
          pending: proposals.filter((p) => p.status === 'submitted').length,
        }))
      )
    ).then((results) => {
      if (cancelled) return
      const sMap = {}
      const pMap = {}
      results.forEach((r) => {
        sMap[r.id] = r.summary
        pMap[r.id] = r.pending
      })
      setSummaries(sMap)
      setPendingByEvent(pMap)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [events])

  // ---- org-wide rollups ----
  const totals = events.reduce(
    (acc, ev) => {
      const s = summaries[ev.id]
      if (!s) return acc
      acc.estIncome += s.est_income || 0
      acc.actIncome += s.act_income || 0
      acc.estExpense += s.est_expense || 0
      acc.actExpense += s.act_expense || 0
      acc.profit += s.profit || 0
      return acc
    },
    { estIncome: 0, actIncome: 0, estExpense: 0, actExpense: 0, profit: 0 }
  )
  const totalPending = Object.values(pendingByEvent).reduce((a, b) => a + b, 0)

  const upcoming = [...events]
    .filter((e) => e.start_date && daysUntil(e.start_date) >= 0)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

  const currency = events[0]?.currency || 'INR'

  return (
    <div>
      <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
        <div>
          <h2 className="font-display text-3xl font-semibold text-ink mb-1">
            Workspace{user?.org_name ? ` · ${user.org_name}` : ''}
          </h2>
          <p className="text-sm text-ink/55">
            Everything across your {events.length} event{events.length === 1 ? '' : 's'}, at a glance.
          </p>
        </div>
        <Link
          to="/events"
          className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
        >
          + New Event
        </Link>
      </div>

      {eventsLoading ? (
        <p className="text-ink/50 text-sm mt-8">Loading workspace...</p>
      ) : events.length === 0 ? (
        <div className="bg-card border border-rule rounded-xl p-10 text-center mt-8">
          <p className="text-ink/70 mb-4">You don't have any events yet.</p>
          <Link
            to="/events"
            className="inline-block bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <>
          {/* Org-wide rollup */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 mb-8">
            <StatCard label="Total Actual Income" value={totals.actIncome} currency={currency} tone="positive" />
            <StatCard label="Total Actual Expense" value={totals.actExpense} currency={currency} tone="negative" />
            <StatCard
              label="Net Position"
              value={totals.profit}
              currency={currency}
              tone={totals.profit >= 0 ? 'positive' : 'negative'}
            />
            <StatCard
              label="Pending Approvals"
              value={totalPending}
              tone={totalPending > 0 ? 'warning' : 'neutral'}
              hint={totalPending > 0 ? 'Awaiting your review' : 'All caught up'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Event list — the core of the workspace */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-semibold text-ink">Your Events</h3>
                {loading && <span className="text-xs text-ink/40">Refreshing…</span>}
              </div>
              <div className="space-y-3">
                {events.map((ev) => {
                  const s = summaries[ev.id]
                  const health = healthFromSummary(s)
                  const days = daysUntil(ev.start_date)
                  const pending = pendingByEvent[ev.id] || 0
                  const isActive = String(ev.id) === String(activeEventId)

                  return (
                    <div
                      key={ev.id}
                      className={`lift bg-card border rounded-xl p-4 transition-colors ${
                        isActive ? 'border-primary-500/60' : 'border-rule'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/events/${ev.id}`}
                              className="font-display text-base font-semibold text-ink hover:text-primary-500 truncate"
                            >
                              {ev.name}
                            </Link>
                            {isActive && (
                              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-500">
                                Active
                              </span>
                            )}
                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${TONE_TEXT[health.tone]} bg-well`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[health.tone]}`} />
                              {health.status}
                            </span>
                          </div>
                          <p className="text-xs text-ink/45 mt-1">
                            {ev.venue ? `${ev.venue} · ` : ''}
                            {ev.start_date
                              ? days > 0
                                ? `in ${days} day${days === 1 ? '' : 's'}`
                                : days === 0
                                ? 'Today'
                                : `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
                              : 'No date set'}
                          </p>
                        </div>

                        {!isActive && (
                          <button
                            onClick={() => setActiveEventId(String(ev.id))}
                            className="text-xs font-semibold text-ink/60 hover:text-primary-500 border border-rule rounded-full px-3 py-1 whitespace-nowrap"
                          >
                            Switch to
                          </button>
                        )}
                      </div>

                      {s && (
                        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-rule">
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide">Profit</p>
                            <p className={`figure text-sm font-semibold ${s.profit >= 0 ? 'text-success-500' : 'text-deficit-500'}`}>
                              {formatMoney(s.profit, ev.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide">Budget Used</p>
                            <p className="figure text-sm font-semibold text-ink">{s.budget_utilization}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide">Pending</p>
                            <p className={`figure text-sm font-semibold ${pending > 0 ? 'text-warning-500' : 'text-ink'}`}>
                              {pending}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right rail: quick links + upcoming */}
            <div className="space-y-6">
              <div className="bg-card border border-rule rounded-xl p-4">
                <h3 className="font-display text-sm font-semibold text-ink mb-3">Quick Links</h3>
                <div className="flex flex-col gap-1">
                  <Link to="/budget" className="text-sm text-ink/70 hover:text-primary-500 py-1.5">
                    Budget Proposals
                  </Link>
                  <Link to="/analytics" className="text-sm text-ink/70 hover:text-primary-500 py-1.5">
                    Analytics
                  </Link>
                  <Link to="/notifications" className="text-sm text-ink/70 hover:text-primary-500 py-1.5 flex items-center justify-between">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="bg-primary-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/vendors" className="text-sm text-ink/70 hover:text-primary-500 py-1.5">
                    Vendors
                  </Link>
                  <Link to="/sponsors" className="text-sm text-ink/70 hover:text-primary-500 py-1.5">
                    Sponsors
                  </Link>
                </div>
              </div>

              <div className="bg-card border border-rule rounded-xl p-4">
                <h3 className="font-display text-sm font-semibold text-ink mb-3">Coming Up</h3>
                {upcoming.length === 0 ? (
                  <p className="text-xs text-ink/40">No upcoming events on the calendar.</p>
                ) : (
                  <div className="space-y-2.5">
                    {upcoming.slice(0, 5).map((ev) => {
                      const days = daysUntil(ev.start_date)
                      return (
                        <div key={ev.id} className="flex items-center justify-between gap-2">
                          <Link to={`/events/${ev.id}`} className="text-sm text-ink/80 hover:text-primary-500 truncate">
                            {ev.name}
                          </Link>
                          <span className="text-xs text-ink/40 font-medium whitespace-nowrap">
                            {days === 0 ? 'Today' : `${days}d`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
