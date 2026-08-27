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
  const { events, activeEventId, loading: eventsLoading } = useActiveEvent()
  const role = useMyRole(activeEventId)
  const [summary, setSummary] = useState(null)
  const [widgetData, setWidgetData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeEvent = events.find((e) => String(e.id) === String(activeEventId))

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
      .then((nList) => setAlerts(nList.filter((n) => !n.is_read)))
      .catch(() => {})

    Promise.all([
      eventsApi.getEventSummary(activeEventId),
      departmentsApi.listDepartments(activeEventId),
      budgetApi.listProposals(activeEventId),
      expensesApi.listActualExpenses(activeEventId),
      incomeApi.listActualIncome(activeEventId),
      vendorsApi.listVendors(activeEventId),
      sponsorsApi.listSponsors(activeEventId),
    ])
      .then(([sum, departments, proposals, actualExpenses, actualIncome, vendors, sponsors]) => {
        setSummary(sum)
        setWidgetData({ departments, proposals, actualExpenses, actualIncome, vendors, sponsors })
      })
      .catch(() => setError('Failed to load summary for the active event'))
      .finally(() => setLoading(false))
  }, [activeEventId])

  return (
    <div>
      <h2 className="font-display text-3xl font-semibold text-ink mb-1">
        Welcome{user?.name ? `, ${user.name}` : ''}
      </h2>
      <p className="text-sm text-ink/55 mb-6">
        {user?.org_name ? `${user.org_name} · ` : ''}Here's how your active event is tracking.
      </p>

      {alerts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                {alerts.length} Active Alert(s) Detected
              </h4>
              <p className="text-xs text-ink/80 mt-0.5">{alerts[0].message}</p>
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
      ) : events.length === 0 ? (
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
              <h3 className="font-display text-xl font-semibold text-ink">{activeEvent.name}</h3>
              {activeEvent.status && <StampBadge status={activeEvent.status} size="xs" />}
            </div>
            <Link to={`/events/${activeEvent.id}`} className="text-sm text-primary-500 hover:text-primary-400">
              View full event →
            </Link>
          </div>

          {error && <div className="mb-4 text-sm text-deficit-500 bg-deficit-50 rounded px-3 py-2">{error}</div>}

          {loading || !summary || !widgetData ? (
            <p className="text-ink/50 text-sm">Loading summary...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

              <div className={`grid grid-cols-1 gap-4 mb-6 ${role.level === 'event_admin' || role.level === 'finance_head' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <EventCountdown event={activeEvent} />
                <FinancialHealthWidget summary={summary} currency={activeEvent.currency} />
                {(role.level === 'event_admin' || role.level === 'finance_head') && (
                  <EventProgress departments={widgetData.departments} proposals={widgetData.proposals} />
                )}
              </div>

              <div className="mb-6">
                {role.level === 'dept_head' || role.level === 'volunteer' ? (
                  <MyDepartmentCard
                    department={widgetData.departments.find((d) => String(d.id) === String(role.deptId))}
                    proposals={widgetData.proposals}
                    actualExpenses={widgetData.actualExpenses}
                    currency={activeEvent.currency}
                  />
                ) : (
                  <DepartmentHealthCards
                    departments={widgetData.departments}
                    proposals={widgetData.proposals}
                    actualExpenses={widgetData.actualExpenses}
                    currency={activeEvent.currency}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
                <PendingApprovals proposals={widgetData.proposals} currency={activeEvent.currency} canApprove={role.canApproveBudget} />
                <ActivityTimeline
                  proposals={widgetData.proposals}
                  actualExpenses={widgetData.actualExpenses}
                  actualIncome={widgetData.actualIncome}
                  vendors={widgetData.vendors}
                  sponsors={widgetData.sponsors}
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
        {events.length > 0 && (
          <div className="bg-card border border-rule rounded-xl divide-y divide-rule">
            {events.map((ev) => (
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
