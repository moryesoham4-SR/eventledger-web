import { useEffect, useState } from 'react'
import * as incomeApi from '../api/income'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useMyRole } from '../hooks/useMyRole'
import { useActiveEvent } from '../context/EventContext'

const EMPTY_EST = { source: '', category: 'Other', amount: '', notes: '' }
const EMPTY_ACT = { source: '', category: 'Other', amount: '', received_on: '', payment_mode: 'Cash', reference: '', notes: '' }

let bulkRowId = 0
const newBulkRow = () => ({ _key: ++bulkRowId, source: '', category: 'Other', amount: '' })

function IncomeTab({ eventId, mode, canManage }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const isEstimated = mode === 'estimated'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(isEstimated ? EMPTY_EST : EMPTY_ACT)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkRows, setBulkRows] = useState([newBulkRow(), newBulkRow(), newBulkRow()])
  const [bulkSaving, setBulkSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = isEstimated
        ? await incomeApi.listEstimatedIncome(eventId)
        : await incomeApi.listActualIncome(eventId)
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
      setError('Failed to load income')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    setForm(isEstimated ? EMPTY_EST : EMPTY_ACT)
    setShowForm(false)
    setBulkMode(false)
    setBulkRows([newBulkRow(), newBulkRow(), newBulkRow()])
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
      toast.success('Income added')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add income'))
    }
  }

  const handleDelete = async (id) => {
    if (!(await confirm('Delete this income entry?', { danger: true, confirmLabel: 'Delete' }))) return
    try {
      if (isEstimated) await incomeApi.deleteEstimatedIncome(id)
      else await incomeApi.deleteActualIncome(id)
      load()
      toast.success('Income deleted')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete income'))
    }
  }

  const updateBulkRow = (key, field, value) => {
    setBulkRows((rows) => rows.map((r) => (r._key === key ? { ...r, [field]: value } : r)))
  }
  const addBulkRow = () => setBulkRows((rows) => [...rows, newBulkRow()])
  const removeBulkRow = (key) => setBulkRows((rows) => rows.filter((r) => r._key !== key))

  const handleSaveBulk = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const validRows = bulkRows.filter((r) => r.source.trim() && r.amount !== '' && !isNaN(Number(r.amount)))
    if (validRows.length === 0) {
      toast.error('Fill in at least a source and amount for one row')
      return
    }
    setBulkSaving(true)
    const results = await Promise.allSettled(
      validRows.map((r) => {
        const payload = {
          event_id: Number(eventId),
          source: r.source.trim(),
          category: r.category || 'Other',
          amount: Number(r.amount),
        }
        if (isEstimated) return incomeApi.createEstimatedIncome({ ...payload, notes: '' })
        return incomeApi.createActualIncome({ ...payload, received_on: today, payment_mode: 'Cash', reference: '', notes: '' })
      })
    )
    setBulkSaving(false)
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - succeeded
    if (succeeded > 0) {
      toast.success(`Added ${succeeded} income entr${succeeded === 1 ? 'y' : 'ies'}`)
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

  const safeItems = Array.isArray(items) ? items : []
  const filteredItems = safeItems.filter((item) => {
    if (!item) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (item.source && String(item.source).toLowerCase().includes(q)) ||
      (item.category && String(item.category).toLowerCase().includes(q)) ||
      (item.notes && String(item.notes).toLowerCase().includes(q)) ||
      (item.payment_mode && String(item.payment_mode).toLowerCase().includes(q)) ||
      (item.reference && String(item.reference).toLowerCase().includes(q)) ||
      (item.amount !== undefined && String(item.amount).includes(q))
    )
  })

  const total = safeItems.reduce((sum, i) => sum + Number(i?.amount || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-ink/55">
            Total: <span className="font-semibold text-primary-500">{formatMoney(total)}</span>
          </p>

          <div className="relative">
            <input
              type="text"
              placeholder="Search income..."
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

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setBulkMode(!bulkMode); setShowForm(false) }}
              className="text-sm border border-rule text-ink/75 px-3.5 py-2 rounded-full font-semibold hover:border-primary-400 hover:text-primary-500 transition-colors"
            >
              {bulkMode ? 'Cancel bulk add' : '⊞ Bulk add'}
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setBulkMode(false) }}
              className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
            >
              {showForm ? 'Cancel' : '+ Add income'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-deficit-500 bg-deficit-50 rounded px-3 py-2">{error}</div>}

      {canManage && bulkMode && (
        <div className="bg-card border border-rule rounded-xl p-5 mb-6">
          <p className="text-xs text-ink/50 mb-3">
            Add several {mode} income entries at once. {!isEstimated && 'Actual entries default to today, received by Cash — edit individually afterward if needed.'}
          </p>
          <div className="space-y-2 mb-3">
            {bulkRows.map((row) => (
              <div key={row._key} className="grid grid-cols-12 gap-2 items-center">
                <input
                  placeholder="Source (e.g. Ticket sales)"
                  value={row.source}
                  onChange={(e) => updateBulkRow(row._key, 'source', e.target.value)}
                  className="col-span-5 sm:col-span-5 bg-well border border-rule rounded px-2 py-1.5 text-xs"
                />
                <input
                  placeholder="Category"
                  value={row.category}
                  onChange={(e) => updateBulkRow(row._key, 'category', e.target.value)}
                  className="col-span-4 sm:col-span-4 bg-well border border-rule rounded px-2 py-1.5 text-xs"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) => updateBulkRow(row._key, 'amount', e.target.value)}
                  className="col-span-8 sm:col-span-2 bg-well border border-rule rounded px-2 py-1.5 text-xs"
                />
                <button
                  onClick={() => removeBulkRow(row._key)}
                  disabled={bulkRows.length === 1}
                  className="col-span-4 sm:col-span-1 text-deficit-500 hover:text-deficit-600 text-xs disabled:opacity-30"
                >
                  ✕ Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={addBulkRow} className="text-xs text-primary-500 hover:text-primary-400 font-semibold">
              + Add row
            </button>
            <button
              onClick={handleSaveBulk}
              disabled={bulkSaving}
              className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {bulkSaving ? 'Saving…' : `Save all (${bulkRows.filter((r) => r.source.trim() && r.amount !== '').length})`}
            </button>
          </div>
        </div>
      )}

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-rule rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Source (e.g. Ticket sales)"
              required
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
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
                  value={form.received_on}
                  onChange={(e) => setForm({ ...form, received_on: e.target.value })}
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
                <input
                  placeholder="Reference #"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="bg-well border border-rule rounded px-3 py-2 text-sm"
                />
              </>
            )}
            <input
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-well border border-rule rounded px-3 py-2 text-sm col-span-2"
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
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-ink/60">
            {searchQuery ? `No ${mode} income matching "${searchQuery}"` : `No ${mode} income yet.`}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-xl divide-y divide-rule">
          {filteredItems.map((item) => (
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
              {canManage && (
                <button onClick={() => handleDelete(item.id)} className="text-xs text-deficit-500 hover:text-deficit-600">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Income() {
  const [mode, setMode] = useState('estimated')
  const { activeEventId } = useActiveEvent()
  const { canApproveBudget: canManage } = useMyRole(activeEventId)

  return (
    <RequireActiveEvent>
      {(eventId) => (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-semibold text-ink">Income</h2>
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
          <IncomeTab eventId={eventId} mode={mode} canManage={canManage} />
        </div>
      )}
    </RequireActiveEvent>
  )
}
