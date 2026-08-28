import { Link } from 'react-router-dom'
import { formatMoney } from './StatCard'

// ---------- Event Countdown ----------
export function EventCountdown({ event }) {
  if (!event?.start_date) return null
  const days = Math.ceil((new Date(event.start_date) - new Date()) / 86400000)
  const label = days > 1 ? `${days} Days Remaining` : days === 1 ? '1 Day Remaining' : days === 0 ? "It's today! 🎉" : `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
  return (
    <div className="lift bg-card border border-rule rounded-xl p-4">
      <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-2">Event Countdown</p>
      <p className="font-display text-xl font-semibold text-ink">{label}</p>
      <p className="text-xs text-ink/40 mt-1">{event.start_date}{event.venue ? ` · ${event.venue}` : ''}</p>
    </div>
  )
}

// ---------- Financial Health ----------
export function FinancialHealthWidget({ summary, currency }) {
  if (!summary) return null
  const util = summary.budget_utilization ?? 0
  let status, tone
  if (summary.profit < 0 || util > 100) { status = 'Over Budget'; tone = 'negative' }
  else if (util > 90) { status = 'Tight'; tone = 'warning' }
  else { status = 'Healthy'; tone = 'positive' }
  const toneClasses = { positive: 'bg-success-500/15 text-success-500', warning: 'bg-warning-500/15 text-warning-500', negative: 'bg-deficit-50 text-deficit-600' }
  const barColor = { positive: '#10B981', warning: '#F59E0B', negative: '#F43F5E' }[tone]

  return (
    <div className="lift bg-card border border-rule rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider">Financial Health</p>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${toneClasses[tone]}`}>{status}</span>
      </div>
      <p className={`figure text-xl font-semibold ${tone === 'negative' ? 'text-deficit-500' : 'text-ink'}`}>
        {formatMoney(summary.profit, currency)} <span className="text-xs text-ink/40 font-normal">profit</span>
      </p>
      <div className="h-1.5 bg-well rounded-full overflow-hidden mt-3">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(util, 100)}%`, background: barColor }} />
      </div>
      <p className="text-xs text-ink/40 mt-1">{util}% of budget used</p>
    </div>
  )
}

// ---------- Event Progress ----------
export function EventProgress({ departments = [], proposals = [] }) {
  const safeDepts = Array.isArray(departments) ? departments : []
  const safeProposals = Array.isArray(proposals) ? proposals : []
  const withApproved = new Set(safeProposals.filter((p) => p?.status === 'approved').map((p) => p?.department_id)).size
  const total = safeDepts.length
  const pct = total ? Math.round((withApproved / total) * 100) : 0
  return (
    <div className="lift bg-card border border-rule rounded-xl p-4">
      <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-2">Event Progress</p>
      <p className="font-display text-xl font-semibold text-ink">{pct}%</p>
      <div className="h-1.5 bg-well rounded-full overflow-hidden mt-3">
        <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-ink/40 mt-1">{withApproved}/{total} departments have an approved budget</p>
    </div>
  )
}

// ---------- My Department (for dept_head / volunteer — their data only) ----------
export function MyDepartmentCard({ department, proposals = [], actualExpenses = [], currency }) {
  if (!department) {
    return (
      <div className="bg-card border border-rule rounded-xl p-6 text-center">
        <p className="text-sm text-ink/60">You're not assigned to a department on this event yet.</p>
      </div>
    )
  }

  const safeProposals = Array.isArray(proposals) ? proposals : []
  const safeExpenses = Array.isArray(actualExpenses) ? actualExpenses : []

  const approvedProposals = safeProposals.filter((p) => p?.status === 'approved')
  const approved = approvedProposals.reduce((s, p) => s + Number(p?.total_amount || 0), 0)
  const spent = safeExpenses.reduce((s, e) => s + Number(e?.amount || 0), 0)
  const remaining = approved - spent
  const pct = approved ? Math.round((spent / approved) * 100) : spent > 0 ? 100 : 0
  const tone = pct > 100 ? 'negative' : pct > 80 ? 'warning' : 'positive'
  const barColor = { positive: '#10B981', warning: '#F59E0B', negative: '#F43F5E' }[tone]
  const toneClasses = { positive: 'bg-success-500/15 text-success-500', warning: 'bg-warning-500/15 text-warning-500', negative: 'bg-deficit-50 text-deficit-600' }
  const statusLabel = { positive: 'Healthy', warning: 'Near limit', negative: 'Over budget' }[tone]

  return (
    <div className="bg-card border border-rule rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: department.color || '#1F6F5C' }} />
          <h3 className="font-display text-lg font-semibold text-ink">{department.name}</h3>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${toneClasses[tone]}`}>{statusLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-1">Approved</p>
          <p className="figure text-lg font-semibold text-ink">{formatMoney(approved, currency)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-1">Used</p>
          <p className="figure text-lg font-semibold text-deficit-500">{formatMoney(spent, currency)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-1">Remaining</p>
          <p className={`figure text-lg font-semibold ${remaining >= 0 ? 'text-success-500' : 'text-deficit-500'}`}>{formatMoney(remaining, currency)}</p>
        </div>
      </div>

      <div className="h-2 bg-well rounded-full overflow-hidden mb-1">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
      </div>
      <p className="text-xs text-ink/40 mb-4">{pct}% of approved budget used</p>

      {approvedProposals.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-2">Approved proposals</p>
          <div className="space-y-1.5">
            {approvedProposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-ink/80">{p.title}</span>
                <span className="figure text-ink/60">{formatMoney(p.total_amount, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Department Health ----------
export function DepartmentHealthCards({ departments = [], proposals = [], actualExpenses = [], currency }) {
  const safeDepts = Array.isArray(departments) ? departments : []
  const safeProposals = Array.isArray(proposals) ? proposals : []
  const safeExpenses = Array.isArray(actualExpenses) ? actualExpenses : []

  if (safeDepts.length === 0) return null

  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-ink mb-3">Department Health</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {safeDepts.map((d) => {
          const approved = safeProposals
            .filter((p) => p?.department_id === d.id && p?.status === 'approved')
            .reduce((s, p) => s + Number(p?.total_amount || 0), 0)
          const spent = safeExpenses
            .filter((e) => e?.department_id === d.id)
            .reduce((s, e) => s + Number(e?.amount || 0), 0)
          const pct = approved ? Math.round((spent / approved) * 100) : spent > 0 ? 100 : 0
          const tone = pct > 100 ? 'negative' : pct > 80 ? 'warning' : 'positive'
          const barColor = { positive: '#10B981', warning: '#F59E0B', negative: '#F43F5E' }[tone]
          return (
            <div key={d.id} className="lift bg-card border border-rule rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color || '#1F6F5C' }} />
                  <span className="text-sm font-semibold text-ink">{d.name}</span>
                </div>
                {d.head_name ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                    👤 {d.head_name}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    ⚠️ Head Unassigned
                  </span>
                )}
              </div>
              <p className="figure text-sm text-ink/70">
                {formatMoney(spent, currency)} <span className="text-ink/40">/ {approved ? formatMoney(approved, currency) : 'no budget yet'}</span>
              </p>
              {approved > 0 && (
                <div className="h-1.5 bg-well rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Pending Approvals ----------
export function PendingApprovals({ proposals = [], currency, canApprove }) {
  if (!canApprove) return null
  const safeProposals = Array.isArray(proposals) ? proposals : []
  const pending = safeProposals.filter((p) => p?.status === 'submitted')
  if (pending.length === 0) return null
  return (
    <div className="bg-card border border-rule rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-semibold text-ink">Pending Approvals</h3>
        <span className="bg-warning-500/15 text-warning-500 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
          {pending.length} waiting
        </span>
      </div>
      <div className="space-y-2">
        {pending.slice(0, 5).map((p) => (
          <Link
            key={p.id}
            to="/budget"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-well hover:bg-well/70 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-ink">{p.title}</p>
              <p className="text-xs text-ink/50">{p.dept_name}</p>
            </div>
            <span className="figure text-sm font-semibold text-warning-500">{formatMoney(p.total_amount, currency)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ---------- Recent Activity Timeline ----------
export function ActivityTimeline({ proposals = [], actualExpenses = [], actualIncome = [], vendors = [], sponsors = [] }) {
  const safeProposals = Array.isArray(proposals) ? proposals : []
  const safeExpenses = Array.isArray(actualExpenses) ? actualExpenses : []
  const safeIncome = Array.isArray(actualIncome) ? actualIncome : []
  const safeVendors = Array.isArray(vendors) ? vendors : []
  const safeSponsors = Array.isArray(sponsors) ? sponsors : []

  const items = []

  safeProposals.forEach((p) => {
    if (p?.approved_at) items.push({ ts: p.approved_at, dot: '#10B981', text: `${p.dept_name || 'Department'} — "${p.title}" was approved` })
    if (p?.rejected_at) items.push({ ts: p.rejected_at, dot: '#F43F5E', text: `${p.dept_name || 'Department'} — "${p.title}" was rejected` })
    else if (p?.submitted_at) items.push({ ts: p.submitted_at, dot: '#F59E0B', text: `${p.dept_name || 'Department'} submitted "${p.title}" for approval` })
  })
  safeExpenses.forEach((e) => e?.created_at && items.push({ ts: e.created_at, dot: '#F43F5E', text: `Expense added — ${e.item_name || e.category}` }))
  safeIncome.forEach((i) => i?.created_at && items.push({ ts: i.created_at, dot: '#10B981', text: `Income recorded — ${i.source}` }))
  safeVendors.forEach((v) => v?.created_at && items.push({ ts: v.created_at, dot: '#2563EB', text: `Vendor added — ${v.name}` }))
  safeSponsors.forEach((s) => s?.created_at && items.push({ ts: s.created_at, dot: '#7C3AED', text: `Sponsor added — ${s.name}` }))

  items.sort((a, b) => new Date(b.ts) - new Date(a.ts))
  const recent = items.slice(0, 8)

  if (recent.length === 0) return null

  return (
    <div className="bg-card border border-rule rounded-xl p-4">
      <h3 className="font-display text-lg font-semibold text-ink mb-3">Recent Activity</h3>
      <div className="space-y-3">
        {recent.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.dot, boxShadow: `0 0 6px ${item.dot}99` }} />
            <p className="text-sm text-ink/80 leading-snug">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
