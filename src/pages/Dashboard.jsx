import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as eventsApi from '../api/events'
import * as departmentsApi from '../api/departments'
import * as budgetApi from '../api/budget'
import * as expensesApi from '../api/expenses'
import * as incomeApi from '../api/income'
import * as vendorsApi from '../api/vendors'
import * as sponsorsApi from '../api/sponsors'
import * as notificationsApi from '../api/notifications'
import StatCard from '../components/StatCard'
import StampBadge from '../components/StampBadge'
import { EventCountdown, FinancialHealthWidget, EventProgress, DepartmentHealthCards, MyDepartmentCard, PendingApprovals, ActivityTimeline } from '../components/DashboardWidgets'
import { useActiveEvent } from '../context/EventContext'
import { useAuth } from '../context/AuthContext'
import { useMyRole } from '../hooks/useMyRole'

export default function Dashboard() {
  const { user } = useAuth()
  const { events = [], activeEventId, loading: eventsLoading } = useActiveEvent()
  const role = useMyRole(activeEventId)
  const [summary, setSummary] = useState(null)
  const [widgetData, setWidgetData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const safeEvents = Array.isArray(events) ? events : []
  const activeEvent = safeEvents.find((e) => String(e?.id) === String(activeEventId))

  const eventCurrency = activeEvent?.currency || 'INR'
  const eventName = activeEvent?.name || ''
  const eventId = activeEvent?.id || ''
  const eventAttendees = activeEvent?.expected_attendees ?? '—'

  useEffect(() => {
    if (!activeEventId) {
      setSummary(null)
      setWidgetData(null)
      setAlerts([])
      return
    }
    setLoading(true)
    setError('')

    // Generate alerts for active event
    notificationsApi.generateAlerts(activeEventId)
      .then(() => notificationsApi.listNotifications())
      .then((nList) => setAlerts((Array.isArray(nList) ? nList : []).filter((n) => !n?.is_read)))
      .catch(() => {})

    Promise.all([
      eventsApi.getEventSummary(activeEventId).catch(() => null),
      departmentsApi.listDepartments(activeEventId).catch(() => []),
      budgetApi.listProposals(activeEventId).catch(() => []),
      expensesApi.listActualExpenses(activeEventId).catch(() => []),
      incomeApi.listActualIncome(activeEventId).catch(() => []),
      vendorsApi.listVendors(activeEventId).catch(() => []),
      sponsorsApi.listSponsors(activeEventId).catch(() => []),
    ])
      .then(([sum, departments, proposals, actualExpenses, actualIncome, vendors, sponsors]) => {
        const safeDepts = Array.isArray(departments) ? departments : []
        if (!sum && safeDepts.length === 0) {
          setError('Failed to load summary for the active event')
        } else {
          setSummary(sum || { est_income: 0, act_income: 0, est_expense: 0, act_expense: 0, profit: 0, variance: 0, budget_utilization: 0 })
          setWidgetData({
            departments: safeDepts,
            proposals: Array.isArray(proposals) ? proposals : [],
            actualExpenses: Array.isArray(actualExpenses) ? actualExpenses : [],
            actualIncome: Array.isArray(actualIncome) ? actualIncome : [],
            vendors: Array.isArray(vendors) ? vendors : [],
            sponsors: Array.isArray(sponsors) ? sponsors : [],
          })
        }
      })
      .catch(() => setError('Failed to load summary for the active event'))
      .finally(() => setLoading(false))
  }, [activeEventId])

  const getDesignationBadge = (rLevel) => {
    if (rLevel === 'event_admin') return <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-primary-500/20 text-primary-400 border border-primary-500/30 inline-flex items-center gap-1.5 shadow-xs">👑 Event Head / Lead</span>
    if (rLevel === 'co_host') return <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1.5 shadow-xs">⭐ Co-Head</span>
    if (rLevel === 'finance_head') return <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-positive-500/20 text-positive-400 border border-positive-500/30 inline-flex items-center gap-1.5 shadow-xs">💰 Finance Head</span>
    if (rLevel === 'dept_head') return <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5 shadow-xs">🏷️ Department Head</span>
    if (rLevel === 'volunteer') return <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-ink/10 text-ink/70 border border-rule inline-flex items-center gap-1.5 shadow-xs">🤝 Volunteer</span>
    return null
  }

  const safeAlerts = Array.isArray(alerts) ? alerts : []
  const safeWidgetDepartments = Array.isArray(widgetData?.departments) ? widgetData.departments : []
  const safeWidgetProposals = Array.isArray(widgetData?.proposals) ? widgetData.proposals : []
  const safeWidgetExpenses = Array.isArray(widgetData?.actualExpenses) ? widgetData.actualExpenses : []
  const safeWidgetIncome = Array.isArray(widgetData?.actualIncome) ? widgetData.actualIncome : []
  const safeWidgetVendors = Array.isArray(widgetData?.vendors) ? widgetData.vendors : []
  const safeWidgetSponsors = Array.isArray(widgetData?.sponsors) ? widgetData.sponsors : []

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <h2 className="font-display text-3xl font-semibold text-ink">
          Welcome{user?.name ? `, ${user.name}` : ''}
        </h2>
        {getDesignationBadge(role.level)}
      </div>
      <p className="text-sm text-ink/55 mb-6">
        {user?.org_name ? `${user.org_name} · ` : ''}Here's how your active event is tracking.
      </p>

      {safeAlerts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                {safeAlerts.length} Active Alert(s) Detected
              </h4>
              <p className="text-xs text-ink/80 mt-0.5">{safeAlerts[0]?.message}</p>
            </div>
          </div>
          <Link
            to="/notifications"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/20 px-3.5 py-1.5 rounded-lg border border-amber-500/30 whitespace-nowrap"
          >
            View All Alerts →
          </Link>
        </div>
      )}

      {eventsLoading ? (
        <p className="text-ink/50 text-sm">Loading events...</p>
      ) : safeEvents.length === 0 ? (
        <div className="bg-card border border-rule rounded-xl p-10 text-center">
          <p className="text-ink/70 mb-4">You don't have any events yet.</p>
          <Link
            to="/events"
            className="inline-block bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
          >
            Create your first event
          </Link>
        </div>
      ) : !activeEvent ? (
        <p className="text-ink/50 text-sm">
          Select an active event from the sidebar to see its summary.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-xl font-semibold text-ink">{eventName}</h3>
              {activeEvent.status && <StampBadge status={activeEvent.status} size="xs" />}
            </div>
            {eventId && (
              <Link to={`/events/${eventId}`} className="text-sm text-primary-500 hover:text-primary-400">
                View full event →
              </Link>
            )}
          </div>

          {error && <div className="mb-4 text-sm text-deficit-500 bg-deficit-50 rounded px-3 py-2">{error}</div>}

          {loading || !summary || !widgetData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Estimated Income" value={summary.est_income} currency={eventCurrency} className="glass-card glow-border" />
                <StatCard label="Actual Income" value={summary.act_income} currency={eventCurrency} tone="positive" className="glass-card glow-border" />
                <StatCard label="Estimated Expense" value={summary.est_expense} currency={eventCurrency} className="glass-card glow-border" />
                <StatCard label="Actual Expense" value={summary.act_expense} currency={eventCurrency} tone="negative" className="glass-card glow-border" />
                <StatCard
                  label="Profit / Margin"
                  value={summary.profit}
                  currency={eventCurrency}
                  tone={summary.profit >= 0 ? 'positive' : 'negative'}
                  className="glass-card glow-border"
                />
                <StatCard
                  label="Variance vs Budget"
                  value={summary.variance}
                  currency={eventCurrency}
                  tone={summary.variance >= 0 ? 'positive' : 'negative'}
                  className="glass-card glow-border"
                />
                <StatCard label="Budget Utilization" value={`${summary.budget_utilization}%`} className="glass-card glow-border" />
                <StatCard label="Expected Attendees" value={eventAttendees} className="glass-card glow-border" />
              </div>

              <div className={`grid grid-cols-1 gap-4 mb-6 ${role.level === 'event_admin' || role.level === 'finance_head' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <EventCountdown event={activeEvent} />
                <FinancialHealthWidget summary={summary} currency={eventCurrency} />
                {(role.level === 'event_admin' || role.level === 'finance_head') && (
                  <EventProgress departments={safeWidgetDepartments} proposals={safeWidgetProposals} />
                )}
              </div>

              <div className="mb-6">
                {role.level === 'dept_head' || role.level === 'volunteer' ? (
                  <MyDepartmentCard
                    department={safeWidgetDepartments.find((d) => String(d?.id) === String(role.deptId))}
                    proposals={safeWidgetProposals}
                    actualExpenses={safeWidgetExpenses}
                    currency={eventCurrency}
                  />
                ) : (
                  <DepartmentHealthCards
                    departments={safeWidgetDepartments}
                    proposals={safeWidgetProposals}
                    actualExpenses={safeWidgetExpenses}
                    currency={eventCurrency}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
                <PendingApprovals proposals={safeWidgetProposals} currency={eventCurrency} canApprove={role.canApproveBudget} />
                <ActivityTimeline
                  proposals={safeWidgetProposals}
                  actualExpenses={safeWidgetExpenses}
                  actualIncome={safeWidgetIncome}
                  vendors={safeWidgetVendors}
                  sponsors={safeWidgetSponsors}
                />
              </div>
            </>
          )}
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xl font-semibold text-ink">All events</h3>
          <Link to="/events" className="text-sm text-primary-500 hover:text-primary-400">
            Manage events →
          </Link>
        </div>
        {safeEvents.length > 0 && (
          <div className="bg-card border border-rule rounded-xl divide-y divide-rule">
            {safeEvents.map((ev) => (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-well transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-ink">{ev.name}</span>
                  {ev.status && <StampBadge status={ev.status} size="xs" />}
                </div>
                <span className="figure text-xs text-ink/50">
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
