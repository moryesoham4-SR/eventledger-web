import { useEffect, useState } from 'react'
import * as expensesApi from '../api/expenses'
import * as departmentsApi from '../api/departments'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useActiveEvent } from '../context/EventContext'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

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
    setShowForm(false)
    setBulkMode(false)
    setSearchQuery('')
    setDeptFilter('all')
    setCatFilter('all')
    setBulkRows([newBulkRow(), newBulkRow(), newBulkRow()])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, mode])

  const safeDepartments = Array.isArray(departments) ? departments : []
  const deptName = (id) => safeDepartments.find((d) => String(d.id) === String(id))?.name

  const safeItems = Array.isArray(items) ? items : []
  const uniqueCategories = Array.from(new Set(safeItems.map((i) => i?.category).filter(Boolean))).sort()

  const filteredItems = safeItems.filter((item) => {
    if (!item) return false

    // 1. Department Filter
    if (deptFilter !== 'all') {
      if (String(item.department_id) !== String(deptFilter)) return false
    }

    // 2. Category Filter
    if (catFilter !== 'all') {
      if (item.category !== catFilter) return false
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const department = deptName(item.department_id) || ''
      return (
        (item.item_name && String(item.item_name).toLowerCase().includes(q)) ||
        (item.category && String(item.category).toLowerCase().includes(q)) ||
        (department && String(department).toLowerCase().includes(q)) ||
        (item.description && String(item.description).toLowerCase().includes(q)) ||
        (item.notes && String(item.notes).toLowerCase().includes(q)) ||
        (item.payment_mode && String(item.payment_mode).toLowerCase().includes(q)) ||
        (item.reference && String(item.reference).toLowerCase().includes(q)) ||
        (item.amount !== undefined && String(item.amount).includes(q))
      )
    }
    return true
  })

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
    if (!(await confirm('Delete this expense entry?', { danger: true, confirmLabel: 'Delete' }))) return
    try {
      if (isEstimated) await expensesApi.deleteEstimatedExpense(id)
      else await expensesApi.deleteActualExpense(id)
      load()
      toast.success('Expense deleted')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete expense'))
    }
  }

  const updateBulkRow = (key, field, value) => {
    setBulkRows((rows) => rows.map((r) => (r._key === key ? { ...r, [field]: value } : r)))
  }
  const addBulkRow = () => setBulkRows((rows) => [...rows, newBulkRow()])
  const removeBulkRow = (key) => setBulkRows((rows) => rows.filter((r) => r._key !== key))

  const handleSaveBulk = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const validRows = bulkRows.filter((r) => r.category.trim() && r.amount !== '' && !isNaN(Number(r.amount)))
    if (validRows.length === 0) {
      toast.error('Fill in at least a category and amount for one row')
      return
    }
    setBulkSaving(true)
    const results = await Promise.allSettled(
      validRows.map((r) => {
        const payload = {
          event_id: Number(eventId),
          department_id: r.department_id ? Number(r.department_id) : null,
          category: r.category.trim(),
          item_name: r.item_name.trim(),
          description: '',
          quantity: Number(r.quantity) || 1,
          unit: r.unit || 'unit',
          amount: Number(r.amount),
        }
        if (isEstimated) return expensesApi.createEstimatedExpense(payload)
        return expensesApi.createActualExpense({ ...payload, paid_on: today, payment_mode: 'Cash', status: 'paid', reference: '', notes: '' })
      })
    )
    setBulkSaving(false)
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - succeeded
    if (succeeded > 0) {
      toast.success(`Added ${succeeded} expense${succeeded === 1 ? '' : 's'}`)
      load()
    }
    if (failed > 0) {
      toast.error(`${failed} row${failed === 1 ? '' : 's'} failed to save — check the amounts and try again`)
    }
    if (failed === 0) {
      setBulkMode(false)
      setBulkRows([newBulkRow(), newBulkRow(), newBulkRow()])
    }
  }

  const overallTotal = safeItems.reduce((sum, i) => sum + Number(i?.amount || 0), 0)
  const filteredTotal = filteredItems.reduce((sum, i) => sum + Number(i?.amount || 0), 0)

  return (
    <div>
      {/* Top Action Bar with Filters */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 bg-card p-3 rounded-2xl border border-rule">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Department Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink/50 font-medium">🏢 Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-primary-500"
            >
              <option value="all">All Departments ({safeDepartments.length})</option>
              {safeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink/50 font-medium">🏷️ Category:</span>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-primary-500"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              bulkMode ? 'bg-primary-500/20 text-primary-400 border-primary-500/40' : 'border-rule text-ink/70 hover:border-primary-400'
            }`}
          >
            {bulkMode ? 'Close Bulk Entry' : '⚡ Bulk Add'}
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-xs active:scale-95 transition-all"
          >
            {showForm ? 'Cancel' : '+ Add Expense'}
          </button>
        </div>
      </div>

      {/* Filtered Financial Summary Pill */}
      <div className="mb-4 flex items-center justify-between bg-well/60 border border-rule rounded-xl px-4 py-2.5 text-xs text-ink/70 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink">
            Showing {filteredItems.length} of {safeItems.length} expense item(s)
          </span>
          {deptFilter !== 'all' && (
            <span className="bg-primary-500/15 text-primary-400 border border-primary-500/30 px-2 py-0.5 rounded-md font-semibold text-[11px]">
              Dept: {deptName(deptFilter)}
            </span>
          )}
          {catFilter !== 'all' && (
            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold text-[11px]">
              Cat: {catFilter}
            </span>
          )}
        </div>
        <div>
          Filtered Total: <span className="font-bold text-deficit-500 text-sm ml-1">{formatMoney(filteredTotal)}</span>
          {filteredTotal !== overallTotal && (
            <span className="text-ink/40 ml-1 text-[11px]">(Overall: {formatMoney(overallTotal)})</span>
          )}
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-deficit-500 bg-deficit-50 rounded px-3 py-2">{error}</div>}

      {bulkMode && (
        <div className="bg-card border border-rule rounded-xl p-5 mb-6">
          <p className="text-xs text-ink/50 mb-3">
            Add several {mode} expense items at once. Select department for each row.
          </p>
          <div className="space-y-2 mb-3">
            {bulkRows.map((row) => (
              <div key={row._key} className="grid grid-cols-12 gap-2 items-center">
                <select
                  value={row.department_id}
                  onChange={(e) => updateBulkRow(row._key, 'department_id', e.target.value)}
                  className="col-span-3 bg-well border border-rule rounded px-2 py-1.5 text-xs text-ink font-medium"
                >
                  <option value="">(No Dept)</option>
                  {safeDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Category (e.g. Catering)"
                  value={row.category}
                  onChange={(e) => updateBulkRow(row._key, 'category', e.target.value)}
                  className="col-span-3 bg-well border border-rule rounded px-2 py-1.5 text-xs text-ink"
                />
                <input
                  placeholder="Item Name"
                  value={row.item_name}
                  onChange={(e) => updateBulkRow(row._key, 'item_name', e.target.value)}
                  className="col-span-4 bg-well border border-rule rounded px-2 py-1.5 text-xs text-ink"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) => updateBulkRow(row._key, 'amount', e.target.value)}
                  className="col-span-1 bg-well border border-rule rounded px-2 py-1.5 text-xs text-ink"
                />
                <button
                  onClick={() => removeBulkRow(row._key)}
                  disabled={bulkRows.length === 1}
                  className="col-span-1 text-deficit-500 hover:text-deficit-600 text-xs disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={addBulkRow} className="text-xs text-primary-500 hover:underline">
              + Add row
            </button>
            <button
              onClick={handleSaveBulk}
              disabled={bulkSaving}
              className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {bulkSaving ? 'Saving…' : `Save all (${bulkRows.filter((r) => r.category.trim() && r.amount !== '').length})`}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-rule rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink/50 mb-1">Department</label>
              <select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                className="w-full bg-well border border-rule rounded px-3 py-2 text-sm text-ink"
              >
                <option value="">(None / General)</option>
                {safeDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">Category</label>
              <input
                placeholder="e.g. Catering, Venue, Printing"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-well border border-rule rounded px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">Item Name</label>
              <input
                placeholder="Item name"
                required
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                className="w-full bg-well border border-rule rounded px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-well border border-rule rounded px-3 py-2 text-sm text-ink"
              />
            </div>
            {!isEstimated && (
              <>
                <div>
                  <label className="block text-xs text-ink/50 mb-1">Paid On</label>
                  <input
                    type="date"
                    value={form.paid_on}
                    onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
                    className="w-full bg-well border border-rule rounded px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink/50 mb-1">Payment Mode</label>
                  <select
                    value={form.payment_mode}
                    onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                    className="w-full bg-well border border-rule rounded px-3 py-2 text-sm text-ink"
                  >
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Cheque</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">
            Save Expense
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-ink/60">
            {searchQuery || deptFilter !== 'all' || catFilter !== 'all'
              ? 'No expenses matching the selected filters.'
              : `No ${mode} expenses recorded yet.`}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-xl overflow-hidden divide-y divide-rule">
          {filteredItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 hover:bg-well/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-ink text-sm">{item.item_name || 'Expense Item'}</span>
                  {item.category && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-well px-2 py-0.5 rounded text-ink/60 border border-rule">
                      {item.category}
                    </span>
                  )}
                  {deptName(item.department_id) && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-primary-500/15 text-primary-400 border border-primary-500/30 px-2 py-0.5 rounded">
                      🏢 {deptName(item.department_id)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink/55">
                  {formatMoney(item.amount)}
                  {item.quantity && item.quantity > 1 ? ` (${item.quantity} × ${item.unit || 'unit'})` : ''}
                  {item.paid_on ? ` · ${item.paid_on}` : ''}
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
  const { activeEventId } = useActiveEvent()
  const [departments, setDepartments] = useState([])

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
              <h2 className="font-display text-3xl font-bold text-ink">Expenses Ledger</h2>
              <p className="text-sm text-ink/60 mt-1">
                Track, filter, and allocate event expenses by department, category, and payment mode.
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
            </div>
          </div>

          <ExpensesTab eventId={eventId} mode={mode} departments={departments} />
        </div>
      )}
    </RequireActiveEvent>
  )
}
