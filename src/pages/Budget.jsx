import { useEffect, useRef, useState } from 'react'
import * as budgetApi from '../api/budget'
import * as departmentsApi from '../api/departments'
import StampBadge from '../components/StampBadge'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useActiveEvent } from '../context/EventContext'
import { useMyRole } from '../hooks/useMyRole'
import { getErrorMessage, getBlobErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

function ProposalPanel({ proposalId, onChanged, role }) {
  const toast = useToast()
  const { confirm, promptText } = useConfirm()
  const [proposal, setProposal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showItemForm, setShowItemForm] = useState(false)
  const [newItem, setNewItem] = useState({ category: '', item_name: '', description: '', quantity: 1, unit: 'unit', estimated_cost: '' })

  const load = async () => {
    setLoading(true)
    try {
      const data = await budgetApi.getProposal(proposalId)
      setProposal(data)
    } catch {
      setError("Couldn't load this proposal")
      toast.error("Couldn't load this proposal")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    setShowItemForm(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId])

  if (loading) return <div className="bg-card border border-rule rounded-xl p-8 skeleton h-64" />
  if (error || !proposal) return <div className="bg-card border border-rule rounded-xl p-8 text-deficit-500 text-sm">{error || 'Proposal not found'}</div>

  const isDraft = proposal.status === 'draft'
  const isSubmitted = proposal.status === 'submitted'
  const isDeptHeadOfThis = role.level === 'dept_head' && String(role.deptId) === String(proposal.department_id)
  const canEditLineItems = isDraft && (role.level === 'event_admin' || role.level === 'finance_head' || isDeptHeadOfThis)
  const canSubmit = isDraft && (role.level === 'event_admin' || role.level === 'finance_head' || isDeptHeadOfThis)
  const canApproveOrReject = isSubmitted && role.canApproveBudget

  const handleAddItem = async (e) => {
    e.preventDefault()
    try {
      await budgetApi.addLineItem({
        proposal_id: proposalId,
        ...newItem,
        quantity: Number(newItem.quantity) || 1,
        estimated_cost: Number(newItem.estimated_cost),
      })
      setNewItem({ category: '', item_name: '', description: '', quantity: 1, unit: 'unit', estimated_cost: '' })
      setShowItemForm(false)
      load()
      onChanged?.()
      toast.success('Line item added')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't add that line item"))
    }
  }

  const handleRemoveItem = async (itemId) => {
    if (!(await confirm('Remove this line item?', { danger: true, confirmLabel: 'Remove' }))) return
    try {
      await budgetApi.removeLineItem(itemId)
      load()
      onChanged?.()
      toast.success('Line item removed')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't remove that line item"))
    }
  }

  const handleStatusChange = async (action, note = '') => {
    try {
      if (action === 'submit') await budgetApi.submitProposal(proposalId)
      else if (action === 'approve') await budgetApi.approveProposal(proposalId, note)
      else if (action === 'reject') await budgetApi.rejectProposal(proposalId, note)
      load()
      onChanged?.()
      toast.success(`Proposal marked as ${action}d!`)
    } catch (err) {
      toast.error(getErrorMessage(err, `Couldn't ${action} this proposal`))
    }
  }

  const handleRejectPrompt = async () => {
    const reason = await promptText('Reason for rejection (compulsory):', {
      title: 'Reject Proposal',
      placeholder: 'e.g. Total cost exceeds allocated department cap',
      confirmLabel: 'Reject Proposal',
      danger: true,
    })
    if (reason === null) return
    if (!reason.trim()) {
      toast.error('A written reason for rejection is compulsory!')
      return
    }
    handleStatusChange('reject', reason.trim())
  }

  return (
    <div className="bg-card border border-rule rounded-xl p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-bold text-ink">{proposal.title}</h3>
            <StampBadge status={proposal.status} size="sm" />
          </div>
          <p className="text-xs text-ink/50 mt-1">
            Department: <span className="font-semibold text-ink/80">{proposal.dept_name}</span>
            {proposal.notes && ` · ${proposal.notes}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider">Total Proposed</p>
          <p className="figure text-2xl font-bold text-primary-400">{formatMoney(proposal.total_amount)}</p>
        </div>
      </div>

      {proposal.rejection_reason && (
        <div className="bg-deficit-500/10 border border-deficit-500/30 rounded-lg p-3 text-xs text-deficit-400">
          <span className="font-bold uppercase tracking-wider block mb-0.5">Rejection Note:</span>
          {proposal.rejection_reason}
        </div>
      )}

      {/* Line Items Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-sm font-semibold text-ink">Line Items ({proposal.line_items?.length || 0})</h4>
          {canEditLineItems && (
            <button
              onClick={() => setShowItemForm(!showItemForm)}
              className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
            >
              {showItemForm ? 'Cancel' : '+ Add Line Item'}
            </button>
          )}
        </div>

        {canEditLineItems && showItemForm && (
          <form onSubmit={handleAddItem} className="bg-well border border-rule rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                placeholder="Category (e.g. Equipment, Travel)"
                required
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="bg-card border border-rule rounded px-3 py-1.5 text-xs text-ink"
              />
              <input
                placeholder="Item Name"
                required
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                className="bg-card border border-rule rounded px-3 py-1.5 text-xs text-ink"
              />
              <input
                type="number"
                placeholder="Qty"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                className="bg-card border border-rule rounded px-3 py-1.5 text-xs text-ink"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Cost per unit"
                required
                value={newItem.estimated_cost}
                onChange={(e) => setNewItem({ ...newItem, estimated_cost: e.target.value })}
                className="bg-card border border-rule rounded px-3 py-1.5 text-xs text-ink"
              />
            </div>
            <button type="submit" className="bg-primary-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-primary-700">
              Add Item
            </button>
          </form>
        )}

        {proposal.line_items?.length === 0 ? (
          <p className="text-xs text-ink/40 py-4 text-center border border-dashed border-rule rounded-lg">No line items added yet.</p>
        ) : (
          <div className="border border-rule rounded-lg overflow-hidden divide-y divide-rule">
            {proposal.line_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 text-xs">
                <div>
                  <p className="font-semibold text-ink">{item.item_name}</p>
                  <p className="text-[11px] text-ink/50">
                    {item.category} · {item.quantity} × {formatMoney(item.estimated_cost)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-ink">{formatMoney(item.total_cost)}</span>
                  {canEditLineItems && (
                    <button onClick={() => handleRemoveItem(item.id)} className="text-deficit-500 hover:text-deficit-600">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
        {canSubmit && (
          <button
            onClick={() => handleStatusChange('submit')}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs active:scale-95 transition-all"
          >
            Submit for Approval →
          </button>
        )}
        {canApproveOrReject && (
          <>
            <button
              onClick={handleRejectPrompt}
              className="border border-deficit-500/30 text-deficit-400 hover:bg-deficit-500/10 text-xs font-semibold px-4 py-2 rounded-full transition-all"
            >
              Reject Proposal
            </button>
            <button
              onClick={() => handleStatusChange('approve')}
              className="bg-positive-600 hover:bg-positive-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs active:scale-95 transition-all"
            >
              Approve Proposal ✓
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function BudgetContent({ eventId }) {
  const toast = useToast()
  const role = useMyRole(eventId)
  const [proposals, setProposals] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState({ department_id: '', title: '', notes: '' })
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const canExport = role.level === 'event_admin' || role.level === 'finance_head'
  const canImport = role.level === 'event_admin' || role.level === 'finance_head'

  const load = async () => {
    setLoading(true)
    try {
      const [pData, dData] = await Promise.all([
        budgetApi.listProposals(eventId),
        departmentsApi.listDepartments(eventId).catch(() => []),
      ])
      const pList = Array.isArray(pData) ? pData : []
      setProposals(pList)
      setDepartments(Array.isArray(dData) ? dData : [])
      if (pList.length > 0 && !selectedId) {
        setSelectedId(pList[0].id)
      }
    } catch {
      setError("Couldn't load proposals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const isScopedUser = (role.level === 'dept_head' || role.level === 'volunteer') && role.deptId
  const deptLocked = isScopedUser
  useEffect(() => {
    if (isScopedUser) setForm((f) => ({ ...f, department_id: String(role.deptId) }))
  }, [isScopedUser, role.deptId])

  const canCreateProposal = role.level === 'event_admin' || role.level === 'finance_head' || role.level === 'dept_head'

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const res = await budgetApi.createProposal({
        event_id: Number(eventId),
        department_id: Number(form.department_id),
        title: form.title,
        notes: form.notes,
      })
      setForm({ department_id: isScopedUser ? String(role.deptId) : '', title: '', notes: '' })
      setShowForm(false)
      await load()
      setSelectedId(res.id)
      toast.success('Proposal created')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't create that proposal"))
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await budgetApi.exportBudgetExcel(eventId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `budget-event-${eventId}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Budget exported')
    } catch (err) {
      toast.error(await getBlobErrorMessage(err, "Couldn't export the budget"))
    } finally {
      setExporting(false)
    }
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await budgetApi.importBudget(eventId, file)
      setImportResult(result)
      await load()
      toast.success(`Imported ${result.proposals_created} proposal(s), ${result.line_items_created} line item(s)`)
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't import that file"))
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const safeProposals = Array.isArray(proposals) ? proposals : []
  const filteredProposals = safeProposals.filter((p) => {
    if (!p) return false

    // 1. Department Filter
    if (deptFilter !== 'all') {
      if (String(p.department_id) !== String(deptFilter)) return false
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      if (p.status !== statusFilter) return false
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchLineItems = (p.line_items || []).some(
        (li) => (li.item_name && li.item_name.toLowerCase().includes(q)) || (li.category && li.category.toLowerCase().includes(q))
      )
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.dept_name && p.dept_name.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (p.status && p.status.toLowerCase().includes(q)) ||
        matchLineItems
      )
    }
    return true
  })

  return (
    <div>
      {/* Top Header & Filter Controls */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 bg-card p-4 rounded-2xl border border-rule">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-2xl font-semibold text-ink">Budget Proposals</h2>

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

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink/50 font-medium">🚦 Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted (Pending)</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search proposals..."
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
          {canExport && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-xs border border-rule text-ink/75 px-3.5 py-1.5 rounded-full font-semibold hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50"
            >
              {exporting ? 'Exporting…' : '⬇ Export Excel'}
            </button>
          )}
          {canImport && (
            <>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className="text-xs border border-rule text-ink/75 px-3.5 py-1.5 rounded-full font-semibold hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing…' : '⬆ Import'}
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleImportFile} className="hidden" />
            </>
          )}
          {canCreateProposal && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-xs active:scale-95 transition-all"
            >
              {showForm ? 'Cancel' : '+ New Proposal'}
            </button>
          )}
        </div>
      </div>

      {importResult && (
        <div className="mb-4 text-sm bg-well border border-rule rounded-lg px-4 py-3">
          <p className="text-ink">
            Imported <span className="font-semibold text-success-500">{importResult.proposals_created}</span> proposal
            {importResult.proposals_created === 1 ? '' : 's'} and{' '}
            <span className="font-semibold text-success-500">{importResult.line_items_created}</span> line item
            {importResult.line_items_created === 1 ? '' : 's'}.
          </p>
          {importResult.errors?.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-deficit-500 text-xs">
              {importResult.errors.map((e, i) => (
                <li key={i}>⚠ {e}</li>
              ))}
            </ul>
          )}
          <button onClick={() => setImportResult(null)} className="text-xs text-ink/50 hover:text-ink mt-2">
            Dismiss
          </button>
        </div>
      )}

      {error && <div className="mb-4 text-sm text-deficit-600 bg-deficit-50 rounded-lg px-3 py-2.5">{error}</div>}

      {canCreateProposal && showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-rule rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Proposal title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink"
            />
            <select
              required
              disabled={deptLocked}
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink disabled:opacity-50"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink col-span-1 sm:col-span-2"
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">
            Create proposal
          </button>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 skeleton rounded-xl" />
          <div className="md:col-span-2 h-40 skeleton rounded-xl" />
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-ink/60">
            {searchQuery || deptFilter !== 'all' || statusFilter !== 'all'
              ? 'No budget proposals matching the selected filters.'
              : canCreateProposal
              ? "No proposals on the books yet — start one above (you'll need a department first)."
              : 'Nothing here for your department yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-rule rounded-xl divide-y divide-rule h-fit overflow-hidden">
            {filteredProposals.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-4 py-3 hover:bg-well transition-colors ${selectedId === p.id ? 'bg-primary-500/10' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{p.title}</span>
                  <StampBadge status={p.status} size="xs" />
                </div>
                <p className="text-xs text-ink/50 mt-0.5">{p.dept_name}</p>
              </button>
            ))}
          </div>
          <div className="md:col-span-2">
            {selectedId && <ProposalPanel proposalId={selectedId} onChanged={load} role={role} />}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Budget() {
  return <RequireActiveEvent>{(eventId) => <BudgetContent eventId={eventId} />}</RequireActiveEvent>
}
