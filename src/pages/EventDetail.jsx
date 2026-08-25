import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as eventsApi from '../api/events'
import * as departmentsApi from '../api/departments'
import StatCard from '../components/StatCard'
import StampBadge from '../components/StampBadge'
import ActivityFeed from '../components/ActivityFeed'
import { useActiveEvent } from '../context/EventContext'
import { useMyRole } from '../hooks/useMyRole'
import { getErrorMessage, getBlobErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'

const SECTIONS = [
  { path: '/budget', label: 'Budget Proposals' },
  { path: '/expenses', label: 'Expenses' },
  { path: '/income', label: 'Income' },
  { path: '/vendors', label: 'Vendors' },
  { path: '/sponsors', label: 'Sponsors' },
]

export default function EventDetail() {
  const toast = useToast()
  const { id } = useParams()
  const { activeEventId, setActiveEventId } = useActiveEvent()
  const { canManageDepartments, canApproveBudget } = useMyRole(id) // event_admin/finance_head powers
  const [event, setEvent] = useState(null)
  const [summary, setSummary] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)
  const [justStamped, setJustStamped] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

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

  const toggleStatus = async () => {
    const nextStatus = event.status === 'completed' ? 'active' : 'completed'
    setStatusBusy(true)
    try {
      const updated = await eventsApi.updateEvent(id, { status: nextStatus })
      setEvent(updated)
      setJustStamped(true)
      setTimeout(() => setJustStamped(false), 500)
      toast.success(nextStatus === 'completed' ? 'Event marked as finished 🎉' : 'Event reopened')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update event status'))
    } finally {
      setStatusBusy(false)
    }
  }

  const canImportExport = canManageDepartments || canApproveBudget // event_admin or finance_head

  const handleExportAll = async () => {
    setExporting(true)
    try {
      const blob = await eventsApi.exportEventData(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `event_export_${id}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Event exported')
    } catch (err) {
      toast.error(await getBlobErrorMessage(err, "Couldn't export this event"))
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadReport = async () => {
    setDownloadingReport(true)
    try {
      const blob = await eventsApi.downloadReportPdf(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = (event?.name || 'event').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_') || 'event'
      a.download = `${safeName}_report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch (err) {
      toast.error(await getBlobErrorMessage(err, "Couldn't generate the PDF report"))
    } finally {
      setDownloadingReport(false)
    }
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await eventsApi.importEventData(id, file)
      setImportResult(result)
      await load()
      toast.success('Import complete')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't import that file"))
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton h-5 w-24 rounded mb-4" />
        <div className="flex items-center gap-4 mb-6">
          <div className="skeleton h-20 w-20 rounded-full" />
          <div className="skeleton h-7 w-56 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    )
  }
  if (error && !event) return <p className="text-deficit-500 text-sm">{error}</p>
  if (!event) return null

  const isActive = String(activeEventId) === String(id)
  const currency = event.currency || 'INR'
  const isFinished = event.status === 'completed'

  return (
    <div>
      <Link to="/events" className="text-sm text-primary-500 mb-4 inline-block">
        ← Back to Events
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <StampBadge status={event.status} size="lg" animate={justStamped} />
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">{event.name}</h2>
            <p className="text-sm text-ink/55 mt-1">
              {[event.venue, event.start_date].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="text-sm border border-rule text-ink/75 px-3.5 py-2 rounded-full font-semibold hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {downloadingReport ? 'Generating…' : '📄 Download PDF Report'}
          </button>

          {!isActive ? (
            <button
              onClick={() => setActiveEventId(String(id))}
              className="text-sm border border-primary-500 text-primary-500 px-3 py-1.5 rounded font-medium hover:bg-primary-500/10"
            >
              Set as active event
            </button>
          ) : (
            <span className="text-xs bg-primary-500/15 text-primary-400 px-3 py-1.5 rounded font-medium">
              Active event
            </span>
          )}

          {/* Only the event's admin gets to flip this — everyone else just sees the stamp. */}
          {canManageDepartments && (
            <button
              onClick={toggleStatus}
              disabled={statusBusy}
              className={`text-sm px-4 py-2 rounded-full font-semibold shadow-sm transition-transform active:scale-95 disabled:opacity-50 ${
                isFinished
                  ? 'bg-card border border-ink/20 text-ink hover:border-ink/40'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {statusBusy ? 'Updating…' : isFinished ? '↺ Reopen event' : '🎉 Wrap it up — mark finished'}
            </button>
          )}
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lift bg-card border border-rule rounded-xl p-5">
          <h3 className="font-display font-semibold text-ink mb-3">Departments</h3>
          {departments.length === 0 ? (
            <p className="text-sm text-ink/55">
              No departments yet.{' '}
              <Link to="/departments" onClick={() => setActiveEventId(String(id))} className="text-primary-500">
                Add one
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {departments.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-sm text-ink/80">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: d.color || '#1F6F5C' }}
                  />
                  {d.name}
                  {d.head_name && <span className="text-ink/40">— {d.head_name}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lift bg-card border border-rule rounded-xl p-5">
          <h3 className="font-display font-semibold text-ink mb-3">Manage this event</h3>
          <p className="text-xs text-ink/55 mb-3">
            Set this as your active event, then jump into any section below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SECTIONS.map((s) => (
              <Link
                key={s.path}
                to={s.path}
                onClick={() => setActiveEventId(String(id))}
                className="text-sm border border-rule rounded-full px-3.5 py-2 font-semibold text-ink/75 hover:border-primary-400 hover:text-primary-500 transition-colors"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <ActivityFeed eventId={id} />
      </div>

      {canImportExport && (
        <div className="lift bg-card border border-rule rounded-xl p-5 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
            <div>
              <h3 className="font-display font-semibold text-ink">Backup & bulk import</h3>
              <p className="text-xs text-ink/55 mt-0.5">
                One spreadsheet with everything — departments, budgets, expenses, income, vendors, sponsors.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAll}
                disabled={exporting}
                className="text-sm border border-rule text-ink/75 px-3.5 py-2 rounded-full font-semibold hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50"
              >
                {exporting ? 'Exporting…' : '⬇ Export whole event'}
              </button>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className="text-sm border border-rule text-ink/75 px-3.5 py-2 rounded-full font-semibold hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing…' : '⬆ Import'}
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleImportFile} className="hidden" />
            </div>
          </div>

          {importResult && (
            <div className="mt-4 text-sm bg-well border border-rule rounded-lg px-4 py-3">
              <p className="text-ink">
                Imported{' '}
                <span className="font-semibold text-success-500">{importResult.departments_created}</span> department
                {importResult.departments_created === 1 ? '' : 's'},{' '}
                <span className="font-semibold text-success-500">{importResult.budget_proposals_created}</span> budget proposal
                {importResult.budget_proposals_created === 1 ? '' : 's'} (
                <span className="font-semibold text-success-500">{importResult.budget_items_created}</span> line items),{' '}
                <span className="font-semibold text-success-500">{importResult.expenses_created}</span> expense entries,{' '}
                <span className="font-semibold text-success-500">{importResult.income_created}</span> income entries,{' '}
                <span className="font-semibold text-success-500">{importResult.vendors_created}</span> vendors, and{' '}
                <span className="font-semibold text-success-500">{importResult.sponsors_created}</span> sponsors.
              </p>
              {importResult.errors?.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-deficit-500 text-xs">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>⚠ {e}</li>
                  ))}
                </ul>
              )}
              <button onClick={() => setImportResult(null)} className="text-xs text-ink/50 hover:text-ink mt-2">
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
