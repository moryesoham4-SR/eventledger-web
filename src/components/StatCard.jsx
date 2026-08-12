const TONES = {
  neutral: 'text-ink',
  positive: 'text-success-500',
  negative: 'text-deficit-500',
}

function formatMoney(value, currency = 'INR') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${Number(value).toLocaleString()}`
  }
}

/**
 * `trend` (optional): { direction: 'up' | 'down', label: '+12%' } — renders
 * a small colored arrow + label under the figure, matching the spec's
 * ▲ +12% / ▼ -3% pattern. Omit it for stats where a trend doesn't apply.
 */
export default function StatCard({ label, value, currency, tone = 'neutral', hint, trend }) {
  const isMoney = typeof value === 'number' && currency !== undefined
  const isPlainNumber = typeof value === 'number' && currency === undefined
  const display = isMoney ? formatMoney(value, currency) : isPlainNumber ? value.toLocaleString() : value

  return (
    <div className="lift bg-card border border-rule rounded-xl p-4">
      <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-2">{label}</p>
      <p className={`figure text-2xl font-semibold ${TONES[tone] || TONES.neutral}`}>{display}</p>
      {trend && (
        <p className={`text-xs font-medium mt-1.5 ${trend.direction === 'up' ? 'text-success-500' : 'text-deficit-500'}`}>
          {trend.direction === 'up' ? '▲' : '▼'} {trend.label}
        </p>
      )}
      {hint && <p className="text-xs text-ink/40 mt-1">{hint}</p>}
    </div>
  )
}

export { formatMoney }
