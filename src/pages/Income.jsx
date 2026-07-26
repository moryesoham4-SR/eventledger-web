import { useEffect, useState } from 'react'
import * as incomeApi from '../api/income'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { getErrorMessage } from '../api/client'

const EMPTY_EST = { source: '', category: 'Other', amount: '', notes: '' }
const EMPTY_ACT = { source: '', category: 'Other', amount: '', received_on: '', payment_mode: 'Cash', reference: '', notes: '' }

function IncomeTab({ eventId, mode }) {
  const isEstimated = mode === 'estimated'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(isEstimated ? EMPTY_EST : EMPTY_ACT)

  const load = async () => {
    setLoading(true)
    try {
      const data = isEstimated
        ? await incomeApi.listEstimatedIncome(eventId)
        : await incomeApi.listActualIncome(eventId)
      setItems(data)
    } catch {
      setError('Failed to load income')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    setForm(isEstimated ? EMPTY_EST : EMPTY_ACT)
    setShowForm(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, mode])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const payload = { event_id: Number(eventId), ...form, amount: Number(form.amount) }
      if (isEstimated) await incomeApi.createEstimatedIncome(payload)
      else await incomeApi.createActualIncome(payload)
      setForm(isEstimated ? EMPTY_EST : EMPTY_ACT)
      setShowForm(false)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add income'))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this income entry?')) return
    if (isEstimated) await incomeApi.deleteEstimatedIncome(id)
    else await incomeApi.deleteActualIncome(id)
    load()
  }

  const total = items.reduce((sum, i) => sum + Number(i.amount || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink/55">
          Total: <span className="font-semibold text-primary-600">{formatMoney(total)}</span>
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
        >
          {showForm ? 'Cancel' : '+ Add income'}
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-deficit-500 bg-deficit-50 rounded px-3 py-2">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-rule rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Source (e.g. Ticket sales)"
              required
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="border border-rule rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border border-rule rounded px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="border border-rule rounded px-3 py-2 text-sm"
            />
            {!isEstimated && (
              <>
                <input
                  type="date"
                  value={form.received_on}
                  onChange={(e) => setForm({ ...form, received_on: e.target.value })}
                  className="border border-rule rounded px-3 py-2 text-sm"
                />
                <select
                  value={form.payment_mode}
                  onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                  className="border border-rule rounded px-3 py-2 text-sm"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Cheque</option>
                </select>
                <input
                  placeholder="Reference #"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="border border-rule rounded px-3 py-2 text-sm"
                />
              </>
            )}
            <input
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="border border-rule rounded px-3 py-2 text-sm col-span-2"
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">
            Save
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-ink/55 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-ink/55 text-sm">No {mode} income yet.</p>
      ) : (
        <div className="bg-white border border-rule rounded-xl divide-y divide-rule">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium text-ink text-sm">
                  {item.source} <span className="text-xs font-normal text-ink/40">· {item.category}</span>
                </p>
                <p className="text-xs text-ink/55">
                  {formatMoney(item.amount)}
                  {item.received_on ? ` · ${item.received_on}` : ''}
                  {item.payment_mode ? ` · ${item.payment_mode}` : ''}
                </p>
              </div>
              <button onClick={() => handleDelete(item.id)} className="text-xs text-deficit-500 hover:text-deficit-600">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Income() {
  const [mode, setMode] = useState('estimated')

  return (
    <RequireActiveEvent>
      {(eventId) => (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-semibold text-ink">Income</h2>
            <div className="flex bg-paper rounded-xl p-1">
              {['estimated', 'actual'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-all ${
                    mode === m ? 'bg-white shadow-sm text-ink' : 'text-ink/55'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <IncomeTab eventId={eventId} mode={mode} />
        </div>
      )}
    </RequireActiveEvent>
  )
}
