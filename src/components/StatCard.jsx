const TONES = {
  neutral: 'text-ink',
  positive: 'text-primary-600',
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

export default function StatCard({ label, value, currency, tone = 'neutral', hint }) {
  const isMoney = typeof value === 'number' && currency !== undefined
  const isPlainNumber = typeof value === 'number' && currency === undefined
  const display = isMoney ? formatMoney(value, currency) : isPlainNumber ? value.toLocaleString() : value

  return (
    <div className="bg-white border border-rule rounded p-4">
      <p className="text-[11px] font-semibold text-ink/55 uppercase tracking-wider mb-2">{label}</p>
      <div className="border-t border-rule mb-2" />
      <p className={`figure text-2xl font-semibold ${TONES[tone] || TONES.neutral}`}>{display}</p>
      {hint && <p className="text-xs text-ink/40 mt-1">{hint}</p>}
    </div>
  )
}

export { formatMoney }
