import { useEffect, useState } from 'react'
import * as expensesApi from '../api/expenses'
import * as departmentsApi from '../api/departments'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useActiveEvent } from '../context/EventContext'
import { useMyRole } from '../hooks/useMyRole'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import ReimbursementsTab from '../components/ReimbursementsTab'

const EMPTY_EST = { department_id: '', category: '', item_name: '', description: '', quantity: 1, unit: 'unit', amount: '', notes: '' }
const EMPTY_ACT = { department_id: '', category: '', item_name: '', description: '', quantity: 1, unit: 'unit', amount: '', paid_on: '', payment_mode: 'Cash', status: 'paid', reference: '', notes: '' }

let bulkRowId = 0
const newBulkRow = () => ({ _key: ++bulkRowId, department_id: '', category: '', item_name: '', quantity: 1, unit: 'unit', amount: '' })

function ExpensesTab({ eventId, mode, departments }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const isEstimated = mode === 'estimated'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [form, setForm] = useState(isEstimated ? EMPTY_EST : EMPTY_ACT)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkRows, setBulkRows] = useState([newBulkRow(), newBulkRow(), newBulkRow()])
  const [bulkSaving, setBulkSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = isEstimated
        ? await expensesApi.listEstimatedExpenses(eventId)
        : await expensesApi.listActualExpenses(eventId)
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
      setError('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    setForm(isEstimated ? EMPTY_EST : EMPTY_ACT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, mode])

  const handleCreateSingle = async (e) => {
    e.preventDefault()
    try {
      if (isEstimated) {
        await expensesApi.createEstimatedExpense({
          ...form,
          event_id: Number(eventId),
          department_id: form.department_id ? Number(form.department_id) : null,
          quantity: Number(form.quantity) || 1,
          amount: Number(form.amount),
        })
      } else {
        await expensesApi.createActualExpense({
          ...form,
          event_id: Number(eventId),
          department_id: form.department_id ? Number(form.department_id) : null,
          quantity: Number(form.quantity) || 1,
          amount: Number(form.amount),
        })
      }
      setForm(isEstimated ? EMPTY_EST : EMPTY_ACT)
      setShowForm(false)
      toast.success('Expense recorded')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't record expense"))
    }
  }

  const handleBulkSave = async (e) => {
    e.preventDefault()
    const validRows = bulkRows.filter((r) => r.category && r.item_name && Number(r.amount) > 0)
    if (validRows.length === 0) {
      toast.error('Fill in at least one row with category, item name, and positive amount')
      return
    }
    setBulkSaving(true)
    try {
      const payload = validRows.map((r) => ({
        event_id: Number(eventId),
        department_id: r.department_id ? Number(r.department_id) : null,
        category: r.category,
        item_name: r.item_name,
        quantity: Number(r.quantity) || 1,
        unit: r.unit || 'unit',
        amount: Number(r.amount),
        status: isEstimated ? 'estimated' : 'paid',
        payment_mode: isEstimated ? undefined : 'Cash',
      }))
      const fn = isEstimated ? expensesApi.bulkCreateEstimatedExpenses : expensesApi.bulkCreateActualExpenses
      const res = await fn(eventId, payload)
      toast.success(`Recorded ${res.created_count} expense(s)!`)
      setBulkRows([newBulkRow(), newBulkRow(), newBulkRow()])
      setBulkMode(false)
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't save bulk expenses"))
    } finally {
      setBulkSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!(await confirm('Delete this expense entry?', { danger: true, confirmLabel: 'Delete' }))) return
    try {
      const fn = isEstimated ? expensesApi.deleteEstimatedExpense : expensesApi.deleteActualExpense
      await fn(id)
      toast.success('Expense deleted')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete expense"))
    }
  }

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort()

  const filteredItems = items.filter((item) => {
    if (deptFilter !== 'all') {
      if (String(item.department_id) !== String(deptFilter)) return false
    }
    if (catFilter !== 'all') {
      if (item.category !== catFilter) return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = item.item_name && item.item_name.toLowerCase().includes(q)
      const matchCat = item.category && item.category.toLowerCase().includes(q)
      const matchDesc = item.description && item.description.toLowerCase().includes(q)
      const matchDept = item.dept_name && item.dept_name.toLowerCase().includes(q)
      return matchName || matchCat || matchDesc || matchDept
    }
    return true
  })

  const totalFilteredAmount = filteredItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const selectedDeptObj = departments.find((d) => String(d.id) === String(deptFilter))

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-card p-4 rounded-2xl border border-rule">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink/50 font-medium">🏢 Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-primary-500"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink/50 font-medium">🏷️ Category:</span>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-primary-500"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-well border border-rule rounded-full px-3.5 py-1.5 pl-8 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-primary-500 w-44 sm:w-56 transition-all"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-xs active:scale-95 transition-all"
        >
          {showForm ? 'Cancel' : `+ Add ${isEstimated ? 'Estimated' : 'Actual'} Expense`}
        </button>
      </div>

      {/* Summary Total Pill */}
      {(deptFilter !== 'all' || catFilter !== 'all' || searchQuery) && (
        <div className="flex items-center justify-between bg-primary-500/10 border border-primary-500/30 rounded-xl px-4 py-2 text-xs">
          <span className="text-primary-300 font-medium">
            Filtered Total: <strong className="text-primary-400 font-bold">{selectedDeptObj ? selectedDeptObj.name : 'Selection'}</strong>
            {catFilter !== 'all' ? ` (${catFilter})` : ''}
          </span>
          <span className="figure text-sm font-bold text-primary-400">
            {formatMoney(totalFilteredAmount)} ({filteredItems.length} items)
          </span>
        </div>
      )}

      {error && <div className="text-sm text-deficit-600 bg-deficit-50 rounded-lg px-3 py-2.5">{error}</div>}

      {showForm && (
        <div className="bg-card border border-rule rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <h3 className="font-display text-sm font-semibold text-ink">
              Add {isEstimated ? 'Estimated' : 'Actual'} Expense
            </h3>
            <div className="flex items-center gap-1 bg-well p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setBulkMode(false)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${!bulkMode ? 'bg-card text-ink shadow-xs' : 'text-ink/60'}`}
              >
                Single Item
              </button>
              <button
                type="button"
                onClick={() => setBulkMode(true)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${bulkMode ? 'bg-card text-ink shadow-xs' : 'text-ink/60'}`}
              >
                ⚡ Bulk Entry (Multi-row)
              </button>
            </div>
          </div>

          {!bulkMode ? (
            <form onSubmit={handleCreateSingle} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Category (e.g. Catering, Venue)"
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="bg-well border border-rule rounded px-3 py-2 text-sm text-ink"
                />
                <input
                  placeholder="Item Name"
                  required
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  className="bg-well border border-rule rounded px-3 py-2 text-sm text-ink"
                />
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="bg-well border border-rule rounded px-3 py-2 text-sm text-ink font-medium"
                >
                  <option value="">No Department (General Event Expense)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      🏢 {d.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Total Amount"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="bg-well border border-rule rounded px-3 py-2 text-sm text-ink"
                />
              </div>
              <button type="submit" className="bg-primary-600 text-white font-semibold px-4 py-2 rounded-full text-sm hover:bg-primary-700">
                Save Expense
              </button>
            </form>
          ) : (
            <form onSubmit={handleBulkSave} className="space-y-3">
              <div className="space-y-2">
                {bulkRows.map((r, idx) => (
                  <div key={r._key} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-well/30 p-2 rounded-lg border border-rule">
                    <input
                      placeholder="Category"
                      value={r.category}
                      onChange={(e) => {
                        const updated = [...bulkRows]
                        updated[idx].category = e.target.value
                        setBulkRows(updated)
                      }}
                      className="bg-card border border-rule rounded px-2.5 py-1.5 text-xs text-ink"
                    />
                    <input
                      placeholder="Item Name"
                      value={r.item_name}
                      onChange={(e) => {
                        const updated = [...bulkRows]
                        updated[idx].item_name = e.target.value
                        setBulkRows(updated)
                      }}
                      className="bg-card border border-rule rounded px-2.5 py-1.5 text-xs text-ink"
                    />
                    <select
                      value={r.department_id}
                      onChange={(e) => {
                        const updated = [...bulkRows]
                        updated[idx].department_id = e.target.value
                        setBulkRows(updated)
                      }}
                      className="bg-card border border-rule rounded px-2.5 py-1.5 text-xs text-ink font-medium"
                    >
                      <option value="">Select Dept...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={r.amount}
                      onChange={(e) => {
                        const updated = [...bulkRows]
                        updated[idx].amount = e.target.value
                        setBulkRows(updated)
                      }}
                      className="bg-card border border-rule rounded px-2.5 py-1.5 text-xs text-ink"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setBulkRows([...bulkRows, newBulkRow()])}
                  className="text-xs text-primary-500 font-semibold hover:underline"
                >
                  + Add Another Row
                </button>
                <button type="submit" disabled={bulkSaving} className="bg-primary-600 text-white font-semibold px-4 py-2 rounded-full text-xs hover:bg-primary-700">
                  {bulkSaving ? 'Saving Bulk...' : 'Save All Bulk Expenses'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">💸</p>
          <p className="text-sm text-ink/60">No expenses matching selected filters.</p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-xl overflow-hidden divide-y divide-rule shadow-xs">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-well/30 transition-colors">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-ink text-sm">{item.item_name}</span>
                  <span className="text-xs text-ink/50 font-medium">({item.category})</span>
                  {item.dept_name && (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-primary-500/15 text-primary-400 rounded-full border border-primary-500/30">
                      🏢 {item.dept_name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink/55 mt-0.5">
                  {formatMoney(item.amount)}
                  {item.paid_on ? ` · Paid ${item.paid_on}` : ''}
                  {item.payment_mode ? ` · ${item.payment_mode}` : ''}
                </p>
              </div>
              <button onClick={() => handleDelete(item.id)} className="text-xs text-deficit-500 hover:text-deficit-600 font-semibold px-2 py-1">
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
  const [mode, setMode] = useState('estimated')
  const { activeEvent, activeEventId } = useActiveEvent()
  const role = useMyRole(activeEventId)
  const [departments, setDepartments] = useState([])
  const currency = activeEvent?.currency || 'INR'

  useEffect(() => {
    if (!activeEventId) return
    departmentsApi
      .listDepartments(activeEventId)
      .then((depts) => setDepartments(Array.isArray(depts) ? depts : []))
      .catch(() => setDepartments([]))
  }, [activeEventId])

  return (
    <RequireActiveEvent>
      {(eventId) => (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink">Expenses Ledger & Reimbursements</h2>
              <p className="text-sm text-ink/60 mt-1">
                Track estimated & actual expenses, filter by department, and process 2-stage co-worker reimbursement claims.
              </p>
            </div>
            <div className="flex items-center bg-card border border-rule p-1 rounded-full text-xs font-semibold shadow-xs">
              <button
                onClick={() => setMode('estimated')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  mode === 'estimated' ? 'bg-primary-600 text-white shadow-xs' : 'text-ink/60 hover:text-ink'
                }`}
              >
                Estimated Expenses
              </button>
              <button
                onClick={() => setMode('actual')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  mode === 'actual' ? 'bg-primary-600 text-white shadow-xs' : 'text-ink/60 hover:text-ink'
                }`}
              >
                Actual Expenses
              </button>
              <button
                onClick={() => setMode('reimbursements')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  mode === 'reimbursements' ? 'bg-primary-600 text-white shadow-xs' : 'text-ink/60 hover:text-ink'
                }`}
              >
                📥 Co-Worker Reimbursements
              </button>
            </div>
          </div>

          {mode === 'reimbursements' ? (
            <ReimbursementsTab eventId={eventId} role={role} currency={currency} />
          ) : (
            <ExpensesTab eventId={eventId} mode={mode} departments={departments} />
          )}
        </div>
      )}
    </RequireActiveEvent>
  )
}
