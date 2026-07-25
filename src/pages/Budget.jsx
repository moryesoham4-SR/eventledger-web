import { useEffect, useState } from 'react'
import * as budgetApi from '../api/budget'
import * as departmentsApi from '../api/departments'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useMyRole } from '../hooks/useMyRole'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

function StatusBadge({ status }) {
  return (
    <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
      {status}
    </span>
  )
}

function ProposalPanel({ proposalId, onChanged, role }) {
  const [proposal, setProposal] = useState(null)
  const [error, setError] = useState('')
  const [showLineForm, setShowLineForm] = useState(false)
  const [line, setLine] = useState({ category: '', item_name: '', description: '', quantity: 1, unit: 'unit', unit_price: '' })

  const load = async () => {
    try {
      const data = await budgetApi.getProposal(proposalId)
      setProposal(data)
    } catch {
      setError('Failed to load proposal')
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
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add line item')
    }
  }

  const handleDeleteLine = async (id) => {
    if (!confirm('Remove this line item?')) return
    await budgetApi.deleteLineItem(id)
    load()
  }

  const handleAction = async (action) => {
    try {
      if (action === 'submit') await budgetApi.submitProposal(proposalId)
      if (action === 'approve') await budgetApi.approveProposal(proposalId)
      if (action === 'reject') {
        const reason = prompt('Reason for rejection?') || ''
        await budgetApi.rejectProposal(proposalId, reason)
      }
      load()
      onChanged?.()
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${action} proposal`)
    }
  }

  if (!proposal) return <p className="text-gray-500 text-sm">Loading proposal...</p>

  const lineTotal = (proposal.line_items || []).reduce((s, li) => s + Number(li.total_amount || 0), 0)
  const canApprove = role?.canApproveBudget
  const canEdit =
    role?.level === 'admin' ||
    role?.level === 'finance' ||
    (role?.level === 'dept_head' && String(role?.deptId) === String(proposal.department_id))

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-semibold text-gray-900">{proposal.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{proposal.dept_name || 'No department'}</p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>
      {proposal.notes && <p className="text-sm text-gray-600 mt-2">{proposal.notes}</p>}

      {error && <div className="my-3 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}

      <div className="flex gap-2 mt-4 mb-4">
        {proposal.status === 'draft' && canEdit && (
          <button onClick={() => handleAction('submit')} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded font-medium hover:bg-primary-700">
            Submit for approval
          </button>
        )}
        {proposal.status === 'submitted' && canApprove && (
          <>
            <button onClick={() => handleAction('approve')} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded font-medium hover:bg-emerald-700">
              Approve
            </button>
            <button onClick={() => handleAction('reject')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded font-medium hover:bg-red-700">
              Reject
            </button>
          </>
        )}
        {proposal.status === 'submitted' && !canApprove && (
          <span className="text-xs text-gray-400 italic self-center">Awaiting approval from finance/admin</span>
        )}
        {proposal.status === 'draft' && canEdit && (
          <button onClick={() => setShowLineForm(!showLineForm)} className="text-xs border border-gray-300 px-3 py-1.5 rounded font-medium text-gray-700 hover:border-primary-400">
            {showLineForm ? 'Cancel' : '+ Line item'}
          </button>
        )}
      </div>

      {showLineForm && canEdit && (
        <form onSubmit={handleAddLine} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Category" required value={line.category} onChange={(e) => setLine({ ...line, category: e.target.value })} className="border border-gray-300 rounded px-2.5 py-1.5 text-sm" />
            <input placeholder="Item name" value={line.item_name} onChange={(e) => setLine({ ...line, item_name: e.target.value })} className="border border-gray-300 rounded px-2.5 py-1.5 text-sm" />
            <input placeholder="Unit (e.g. pcs)" value={line.unit} onChange={(e) => setLine({ ...line, unit: e.target.value })} className="border border-gray-300 rounded px-2.5 py-1.5 text-sm" />
            <input type="number" step="0.01" placeholder="Quantity" value={line.quantity} onChange={(e) => setLine({ ...line, quantity: e.target.value })} className="border border-gray-300 rounded px-2.5 py-1.5 text-sm" />
            <input type="number" step="0.01" placeholder="Unit price" required value={line.unit_price} onChange={(e) => setLine({ ...line, unit_price: e.target.value })} className="border border-gray-300 rounded px-2.5 py-1.5 text-sm" />
            <input placeholder="Description" value={line.description} onChange={(e) => setLine({ ...line, description: e.target.value })} className="border border-gray-300 rounded px-2.5 py-1.5 text-sm" />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-3 py-1.5 rounded text-xs font-medium">Add line item</button>
        </form>
      )}

      {(proposal.line_items || []).length === 0 ? (
        <p className="text-sm text-gray-500">No line items yet.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {proposal.line_items.map((li) => (
            <div key={li.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {li.item_name || li.category} <span className="text-xs font-normal text-gray-400">· {li.category}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {li.quantity} {li.unit} × {formatMoney(li.unit_price)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">{formatMoney(li.total_amount)}</span>
                {proposal.status === 'draft' && canEdit && (
                  <button onClick={() => handleDeleteLine(li.id)} className="text-xs text-red-500 hover:text-red-700">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-sm font-bold text-gray-900">{formatMoney(proposal.total_amount || lineTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function BudgetContent({ eventId }) {
  const role = useMyRole(eventId)
  const [proposals, setProposals] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ department_id: '', title: '', notes: '' })

  const canCreateProposal = role.level === 'admin' || role.level === 'finance' || role.level === 'dept_head'

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
      setError('Failed to load budget proposals')
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
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create proposal')
    }
  }

  const deptLocked = role.level === 'dept_head'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Budget Proposals</h2>
        {canCreateProposal && (
          <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700">
            {showForm ? 'Cancel' : '+ New proposal'}
          </button>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}

      {canCreateProposal && showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Proposal title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm" />
            <select
              required
              disabled={deptLocked}
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm col-span-2" />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium">Create proposal</button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : proposals.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {canCreateProposal
            ? "No budget proposals yet. Create one above — you'll need at least one department first."
            : 'No budget proposals yet for your department.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 h-fit">
            {proposals.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selectedId === p.id ? 'bg-primary-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{p.title}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{p.dept_name}</p>
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
