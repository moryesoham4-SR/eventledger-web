import { useEffect, useRef, useState } from 'react'
import * as budgetApi from '../api/budget'
import * as departmentsApi from '../api/departments'
import { formatMoney } from '../components/StatCard'
import StampBadge from '../components/StampBadge'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useMyRole } from '../hooks/useMyRole'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

function ProposalPanel({ proposalId, onChanged, role }) {
  const toast = useToast()
  const { confirm, promptText } = useConfirm()
  const [proposal, setProposal] = useState(null)
  const [showLineForm, setShowLineForm] = useState(false)
  const [justStamped, setJustStamped] = useState(false)
  const [line, setLine] = useState({ category: '', item_name: '', description: '', quantity: 1, unit: 'unit', unit_price: '' })

  const load = async () => {
    try {
      const data = await budgetApi.getProposal(proposalId)
      setProposal(data)
    } catch {
      toast.error("Couldn't load this proposal")
    }
  }

  useEffect(() => {
    load()
    setShowLineForm(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId])

  const handleAddLine = async (e) => {
    e.preventDefault()
    try {
      const qty = Number(line.quantity) || 1
      const unitPrice = Number(line.unit_price) || 0
      await budgetApi.addLineItem({
        proposal_id: Number(proposalId),
        category: line.category,
        item_name: line.item_name,
        description: line.description,
        quantity: qty,
        unit: line.unit,
        unit_price: unitPrice,
        total_amount: qty * unitPrice,
      })
      setLine({ category: '', item_name: '', description: '', quantity: 1, unit: 'unit', unit_price: '' })
      setShowLineForm(false)
      load()
      toast.success('Line item added')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't add that line item"))
    }
  }

  const handleDeleteLine = async (id) => {
    if (!(await confirm('Remove this line item?', { danger: true, confirmLabel: 'Remove' }))) return
    try {
      await budgetApi.deleteLineItem(id)
      load()
      toast.success('Line item removed')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't remove that line item"))
    }
  }

  const ACTION_SUCCESS = {
    submit: 'Sent for approval',
    approve: 'Budget Approved Successfully 🎉',
    reject: 'Budget rejected',
  }

  const handleAction = async (action) => {
    try {
      if (action === 'submit') await budgetApi.submitProposal(proposalId)
      if (action === 'approve') await budgetApi.approveProposal(proposalId)
      if (action === 'reject') {
        const reason = (await promptText('Reason for rejection?', { placeholder: 'e.g. over budget, missing quote', confirmLabel: 'Reject' })) || ''
        await budgetApi.rejectProposal(proposalId, reason)
      }
      await load()
      setJustStamped(true)
      setTimeout(() => setJustStamped(false), 500)
      onChanged?.()
      toast[action === 'reject' ? 'info' : 'success'](ACTION_SUCCESS[action])
    } catch (err) {
      toast.error(getErrorMessage(err, `Couldn't ${action} this proposal`))
    }
  }

  if (!proposal)
    return <div className="h-48 skeleton rounded-xl" />

  const lineTotal = (proposal.line_items || []).reduce((s, li) => s + Number(li.total_amount || 0), 0)
  const canApprove = role?.canApproveBudget
  const canEdit =
    role?.level === 'event_admin' ||
    role?.level === 'finance_head' ||
    (role?.level === 'dept_head' && String(role?.deptId) === String(proposal.department_id))

  return (
    <div className="lift bg-card border border-rule rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-display font-semibold text-ink text-lg">{proposal.title}</h3>
          <p className="text-xs text-ink/50 mt-0.5">{proposal.dept_name || 'No department'}</p>
        </div>
        <StampBadge status={proposal.status} size="sm" animate={justStamped} />
      </div>
      {proposal.notes && <p className="text-sm text-ink/70 mt-2">{proposal.notes}</p>}

      <div className="flex flex-wrap gap-2 mt-4 mb-4">
        {proposal.status === 'draft' && canEdit && (
          <button onClick={() => handleAction('submit')} className="text-xs bg-primary-600 text-white px-3.5 py-1.5 rounded-full font-semibold hover:bg-primary-700 active:scale-95 transition-all">
            Send for approval →
          </button>
        )}
        {proposal.status === 'submitted' && canApprove && (
          <>
            <button onClick={() => handleAction('approve')} className="text-xs bg-primary-600 text-white px-3.5 py-1.5 rounded-full font-semibold hover:bg-primary-700 active:scale-95 transition-all">
              ✓ Approve
            </button>
            <button onClick={() => handleAction('reject')} className="text-xs bg-deficit-500 text-white px-3.5 py-1.5 rounded-full font-semibold hover:bg-deficit-700 active:scale-95 transition-all">
              ✕ Reject
            </button>
          </>
        )}
        {proposal.status === 'submitted' && !canApprove && (
          <span className="text-xs text-ink/40 italic self-center">Sitting with finance/admin for approval ⏳</span>
        )}
        {proposal.status === 'draft' && canEdit && (
          <button onClick={() => setShowLineForm(!showLineForm)} className="text-xs border border-rule px-3.5 py-1.5 rounded-full font-semibold text-ink/70 hover:border-primary-400 hover:text-primary-500 transition-colors">
            {showLineForm ? 'Cancel' : '+ Line item'}
          </button>
        )}
      </div>

      {showLineForm && canEdit && (
        <form onSubmit={handleAddLine} className="bg-well border border-rule rounded-xl p-4 mb-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input placeholder="Category" required value={line.category} onChange={(e) => setLine({ ...line, category: e.target.value })} className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-sm bg-well" />
            <input placeholder="Item name" value={line.item_name} onChange={(e) => setLine({ ...line, item_name: e.target.value })} className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-sm bg-well" />
            <input placeholder="Unit (e.g. pcs)" value={line.unit} onChange={(e) => setLine({ ...line, unit: e.target.value })} className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-sm bg-well" />
            <input type="number" step="0.01" placeholder="Quantity" value={line.quantity} onChange={(e) => setLine({ ...line, quantity: e.target.value })} className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-sm bg-well" />
            <input type="number" step="0.01" placeholder="Unit price" required value={line.unit_price} onChange={(e) => setLine({ ...line, unit_price: e.target.value })} className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-sm bg-well" />
            <input placeholder="Description" value={line.description} onChange={(e) => setLine({ ...line, description: e.target.value })} className="bg-well border border-rule rounded-lg px-2.5 py-1.5 text-sm bg-well" />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-primary-700 active:scale-95 transition-all">
            Add line item
          </button>
        </form>
      )}

      {(proposal.line_items || []).length === 0 ? (
        <p className="text-sm text-ink/50">No line items yet.</p>
      ) : (
        <div className="bg-well border border-rule rounded-xl divide-y divide-rule overflow-hidden">
          {proposal.line_items.map((li) => (
            <div key={li.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-ink">
                  {li.item_name || li.category} <span className="text-xs font-normal text-ink/40">· {li.category}</span>
                </p>
                <p className="figure text-xs text-ink/50">
                  {li.quantity} {li.unit} × {formatMoney(li.unit_price)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="figure text-sm font-semibold text-ink">{formatMoney(li.total_amount)}</span>
                {proposal.status === 'draft' && canEdit && (
                  <button onClick={() => handleDeleteLine(li.id)} className="text-xs text-deficit-500 hover:text-deficit-600 font-medium">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5 bg-well">
            <span className="text-sm font-semibold text-ink/70">Total</span>
            <span className="figure text-sm font-bold text-ink">{formatMoney(proposal.total_amount || lineTotal)}</span>
          </div>
        </div>
      )}
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
  const [form, setForm] = useState({ department_id: '', title: '', notes: '' })
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const canExport = role.level !== null && role.level !== undefined
  const canImport = role.level === 'event_admin' || role.level === 'finance_head'

  const canCreateProposal = role.level === 'event_admin' || role.level === 'finance_head' || role.level === 'dept_head'

  const load = async () => {
    setLoading(true)
    try {
      const [props, depts] = await Promise.all([
        budgetApi.listProposals(eventId),
        departmentsApi.listDepartments(eventId),
      ])
      setProposals(props)
      setDepartments(depts)
      if (!selectedId && props.length > 0) setSelectedId(props[0].id)
    } catch {
      setError("Couldn't load budget proposals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    setSelectedId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  // A dept_head can only ever create proposals for their own department —
  // lock the dropdown to it instead of leaving it open to pick any department.
  useEffect(() => {
    if (role.level === 'dept_head' && role.deptId) {
      setForm((f) => ({ ...f, department_id: String(role.deptId) }))
    }
  }, [role.level, role.deptId])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const created = await budgetApi.createProposal({
        event_id: Number(eventId),
        department_id: Number(form.department_id),
        title: form.title,
        notes: form.notes,
      })
      setForm({ department_id: role.level === 'dept_head' ? String(role.deptId) : '', title: '', notes: '' })
      setShowForm(false)
      await load()
      setSelectedId(created.id)
      toast.success('Proposal created')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't create that proposal"))
    }
  }

  const deptLocked = role.level === 'dept_head'

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await budgetApi.exportBudget(eventId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `budget_export_event_${eventId}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Budget exported')
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't export the budget"))
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
      e.target.value = '' // allow re-selecting the same file name later
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">Budget Proposals</h2>
        <div className="flex items-center gap-2">
          {canExport && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-sm border border-rule text-ink/75 px-3.5 py-2 rounded-full font-semibold hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50"
            >
              {exporting ? 'Exporting…' : '⬇ Export'}
            </button>
          )}
          {canImport && (
            <>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className="text-sm border border-rule text-ink/75 px-3.5 py-2 rounded-full font-semibold hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing…' : '⬆ Import'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleImportFile}
                className="hidden"
              />
            </>
          )}
          {canCreateProposal && (
            <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all">
              {showForm ? 'Cancel' : '+ New proposal'}
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
            <input placeholder="Proposal title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-well border border-rule rounded-lg px-3 py-2 text-sm" />
            <select
              required
              disabled={deptLocked}
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="bg-well border border-rule rounded-lg px-3 py-2 text-sm disabled:bg-well disabled:text-ink/50"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-well border border-rule rounded-lg px-3 py-2 text-sm col-span-1 sm:col-span-2" />
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
      ) : proposals.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🧾</p>
          <p className="text-sm text-ink/60">
            {canCreateProposal
              ? "No proposals on the books yet — start one above (you'll need a department first)."
              : 'Nothing here for your department yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-rule rounded-xl divide-y divide-rule h-fit overflow-hidden">
            {proposals.map((p) => (
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
