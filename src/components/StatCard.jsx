const TONES = {
  neutral: 'text-gray-900',
  positive: 'text-emerald-600',
  negative: 'text-red-600',
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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${TONES[tone] || TONES.neutral}`}>{display}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export { formatMoney }
