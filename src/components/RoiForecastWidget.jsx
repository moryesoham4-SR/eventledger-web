import { useEffect, useState } from 'react'
import * as roiApi from '../api/roi'

export default function RoiForecastWidget({ eventId, currency = 'INR' }) {
  const [ticketPrice, setTicketPrice] = useState(500)
  const [expectedTickets, setExpectedTickets] = useState(200)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    roiApi
      .getRoiForecast(eventId, ticketPrice, expectedTickets)
      .then((data) => setForecast(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId, ticketPrice, expectedTickets])

  if (!eventId) return null

  const getRiskBadge = (risk) => {
    if (risk === 'HIGH') return <span className="text-[10px] uppercase font-extrabold tracking-wide px-2 py-0.5 rounded bg-deficit-500/20 text-deficit-400 border border-deficit-500/30">🚨 High Deficit Risk</span>
    if (risk === 'MODERATE') return <span className="text-[10px] uppercase font-extrabold tracking-wide px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">⚠️ Moderate Margin</span>
    return <span className="text-[10px] uppercase font-extrabold tracking-wide px-2 py-0.5 rounded bg-positive-500/20 text-positive-400 border border-positive-500/30">✅ Healthy Profit Buffer</span>
  }

  return (
    <div className="bg-card border border-rule rounded-2xl p-5 shadow-xs space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-rule pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-ink">📈 AI Event ROI & Revenue Forecast</h3>
            {forecast?.ai_risk && getRiskBadge(forecast.ai_risk)}
          </div>
          <p className="text-xs text-ink/60 mt-0.5">Simulate ticket pricing and attendance targets to forecast break-even profit margins.</p>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-well/40 border border-rule rounded-xl">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-ink/70 mb-1">
            <span>Ticket Price ({currency})</span>
            <span className="font-bold text-primary-500">{currency} {ticketPrice.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="0"
            max="5000"
            step="50"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-ink/70 mb-1">
            <span>Expected Ticket Sales</span>
            <span className="font-bold text-primary-500">{expectedTickets} tickets</span>
          </div>
          <input
            type="range"
            min="0"
            max="2000"
            step="10"
            value={expectedTickets}
            onChange={(e) => setExpectedTickets(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
        </div>
      </div>

      {/* Metrics Cards */}
      {loading || !forecast ? (
        <div className="h-24 skeleton rounded-xl" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-well/60 rounded-xl border border-rule">
              <span className="text-[11px] text-ink/50 uppercase font-bold tracking-wider">Projected Revenue</span>
              <p className="text-base font-bold text-ink mt-1">{currency} {forecast.total_projected_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-well/60 rounded-xl border border-rule">
              <span className="text-[11px] text-ink/50 uppercase font-bold tracking-wider">Total Expense Load</span>
              <p className="text-base font-bold text-ink mt-1">{currency} {forecast.total_expense_load.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`p-3 rounded-xl border ${forecast.net_profit >= 0 ? 'bg-positive-500/10 border-positive-500/20 text-positive-400' : 'bg-deficit-500/10 border-deficit-500/20 text-deficit-400'}`}>
              <span className="text-[11px] uppercase font-bold tracking-wider opacity-80">Projected Net Profit</span>
              <p className="text-base font-bold mt-1">{currency} {forecast.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-well/60 rounded-xl border border-rule">
              <span className="text-[11px] text-ink/50 uppercase font-bold tracking-wider">Break-Even Sales</span>
              <p className="text-base font-bold text-primary-500 mt-1">{forecast.break_even_attendees} Tickets</p>
            </div>
          </div>

          {/* AI Recommendation Banner */}
          <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
            forecast.net_profit < 0 ? 'bg-deficit-500/10 border-deficit-500/30 text-deficit-300' :
            forecast.profit_margin_pct < 15 ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
            'bg-positive-500/10 border-positive-500/30 text-positive-300'
          }`}>
            <span className="font-bold uppercase tracking-wider block mb-1">AI Financial Intelligence Insight:</span>
            {forecast.ai_recommendation}
          </div>
        </div>
      )}
    </div>
  )
}
