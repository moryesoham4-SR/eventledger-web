import { useEffect, useState } from 'react'
import * as expensesApi from '../api/expenses'
import * as departmentsApi from '../api/departments'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useActiveEvent } from '../context/EventContext'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'

const EMPTY_EST = { department_id: '', category: '', item_name: '', description: '', quantity: 1, unit: 'unit', amount: '', notes: '' }
const EMPTY_ACT = { department_id: '', category: '', item_name: '', description: '', quantity: 1, unit: 'unit', amount: '', paid_on: '', payment_mode: 'Cash', status: 'paid', reference: '', notes: '' }

function ExpensesTab({ eventId, mode, departments }) {
  const toast = useToast()
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
        ? await expensesApi.listEstimatedExpenses(eventId)
        : await expensesApi.listActualExpenses(eventId)
      setItems(data)
    } catch {
      setError('Failed to load expenses')
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

  const deptName = (id) => departments.find((d) => String(d.id) === String(id))?.name

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        event_id: Number(eventId),
        ...form,
        department_id: form.department_id ? Number(form.department_id) : null,
        quantity: Number(form.quantity) || 1,
        amount: Number(form.amount),
      }
      if (isEstimated) await expensesApi.createEstimatedExpense(payload)
      else await expensesApi.createActualExpense(payload)
      setForm(isEstimated ? EMPTY_EST : EMPTY_ACT)
      setShowForm(false)
      load()
      toast.success('Expense added')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add expense'))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense entry?')) return
    try {
      if (isEstimated) await expensesApi.deleteEstimatedExpense(id)
      else await expensesApi.deleteActualExpense(id)
      load()
      toast.success('Expense deleted')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete expense'))
    }
  }

  const total = items.reduce((sum, i) => sum + Number(i.amount || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink/55">
          Total: <span className="font-semibold text-deficit-500">{formatMoney(total)}</span>
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
        >
          {showForm ? 'Cancel' : '+ Add expense'}
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-deficit-500 bg-deficit-50 rounded px-3 py-2">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-rule rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Category"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Item name"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            />
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            >
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Unit (e.g. pcs, hrs)"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            />
            {!isEstimated && (
              <>
                <input
                  type="date"
                  value={form.paid_on}
                  onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
                  className="bg-well border border-rule rounded px-3 py-2 text-sm"
                />
                <select
                  value={form.payment_mode}
                  onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                  className="bg-well border border-rule rounded px-3 py-2 text-sm"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Cheque</option>
                </select>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="bg-well border border-rule rounded px-3 py-2 text-sm"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
                <input
                  placeholder="Reference #"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="bg-well border border-rule rounded px-3 py-2 text-sm"
                />
              </>
            )}
            <input
              placeholder="Description / notes"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm col-span-3"
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">
            Save
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🧾</p>
          <p className="text-sm text-ink/60">No {mode} expenses yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-xl divide-y divide-rule">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium text-ink text-sm">
                  {item.item_name || item.category}{' '}
                  <span className="text-xs font-normal text-ink/40">
                    · {item.category}
                    {item.department_id ? ` · ${deptName(item.department_id) || 'Dept #' + item.department_id}` : ''}
                  </span>
                </p>
                <p className="text-xs text-ink/55">
                  {formatMoney(item.amount)}
                  {item.quantity && item.quantity !== 1 ? ` · qty ${item.quantity} ${item.unit || ''}` : ''}
                  {item.paid_on ? ` · ${item.paid_on}` : ''}
                  {item.status ? ` · ${item.status}` : ''}
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

export default function Expenses() {
  const { activeEventId } = useActiveEvent()
  const [mode, setMode] = useState('estimated')
  const [departments, setDepartments] = useState([])

  useEffect(() => {
    if (!activeEventId) {
      setDepartments([])
      return
    }
    departmentsApi.listDepartments(activeEventId).then(setDepartments).catch(() => {})
  }, [activeEventId])

  return (
    <RequireActiveEvent>
      {(eventId) => (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-semibold text-ink">Expenses</h2>
            <div className="flex bg-well rounded-xl p-1">
              {['estimated', 'actual'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-all ${
                    mode === m ? 'bg-card shadow-sm text-ink' : 'text-ink/55'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <ExpensesTab eventId={eventId} mode={mode} departments={departments} />
        </div>
      )}
    </RequireActiveEvent>
  )
}
