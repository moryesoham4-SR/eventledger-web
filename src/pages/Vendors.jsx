import { useEffect, useState } from 'react'
import * as vendorsApi from '../api/vendors'
import * as milestonesApi from '../api/vendor_milestones'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useMyRole } from '../hooks/useMyRole'
import { useActiveEvent } from '../context/EventContext'
import VendorQuoteComparison from '../components/VendorQuoteComparison'
import VendorMilestoneTracker from '../components/VendorMilestoneTracker'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { getErrorMessage } from '../api/client'

function MasterPayoutSchedule({ eventId, currency = 'INR', canManage, onUpdated }) {
  const toast = useToast()
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)

  const loadSchedule = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const data = await milestonesApi.getEventMilestonesSchedule(eventId)
      setSchedule(Array.isArray(data) ? data : [])
    } catch {
      setSchedule([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule()
  }, [eventId])

  if (loading) return <div className="skeleton h-48 rounded-xl" />

  const safeSchedule = Array.isArray(schedule) ? schedule : []
  const pendingItems = safeSchedule.filter((m) => m.status === 'pending')
  const paidItems = safeSchedule.filter((m) => m.status === 'paid')
  const totalPendingPayout = pendingItems.reduce((s, m) => s + Number(m.amount || 0), 0)
  const totalPaidPayout = paidItems.reduce((s, m) => s + Number(m.amount || 0), 0)

  const handleToggleStatus = async (m) => {
    const nextStatus = m.status === 'paid' ? 'pending' : 'paid'
    const today = new Date().toISOString().slice(0, 10)
    try {
      await milestonesApi.updateVendorMilestone(m.id, {
        status: nextStatus,
        paid_date: nextStatus === 'paid' ? today : null,
      })
      toast.success(`Payout marked as ${nextStatus === 'paid' ? 'Paid ✓' : 'Pending ⏳'}`)
      loadSchedule()
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update payout status'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-card border border-rule rounded-xl">
          <p className="text-xs text-ink/50 font-semibold uppercase tracking-wider">Total Scheduled Payouts</p>
          <p className="text-xl font-bold text-ink mt-1">{safeSchedule.length} Milestones</p>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
          <p className="text-xs font-semibold uppercase tracking-wider">Pending Payouts</p>
          <p className="text-xl font-bold mt-1">{formatMoney(totalPendingPayout, currency)}</p>
        </div>
        <div className="p-4 bg-positive-500/10 border border-positive-500/30 rounded-xl text-positive-300">
          <p className="text-xs font-semibold uppercase tracking-wider">Settled / Paid Payouts</p>
          <p className="text-xl font-bold mt-1">{formatMoney(totalPaidPayout, currency)}</p>
        </div>
      </div>

      {safeSchedule.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">💸</p>
          <p className="text-sm text-ink/60">No payment milestones scheduled across vendors yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-xl overflow-hidden divide-y divide-rule">
          {safeSchedule.map((m) => {
            const isPaid = m.status === 'paid'
            return (
              <div key={m.id} className="p-4 flex items-center justify-between gap-3 hover:bg-well/30 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-sm">{m.vendor_name}</span>
                    <span className="text-xs text-ink/50">({m.vendor_category})</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${isPaid ? 'bg-positive-500/20 text-positive-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {isPaid ? 'Paid ✓' : 'Pending ⏳'}
                    </span>
                  </div>
                  <p className="text-xs text-ink/70 font-medium">{m.milestone_name}</p>
                  <p className="text-[11px] text-ink/50">Due Date: {m.due_date || 'TBD'} {m.paid_date ? `· Paid on ${m.paid_date}` : ''}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-ink text-base">{formatMoney(m.amount, currency)}</span>
                  {canManage && (
                    <button
                      onClick={() => handleToggleStatus(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isPaid ? 'bg-well text-ink/70 hover:text-ink' : 'bg-positive-600 text-white hover:bg-positive-700 shadow-xs'
                      }`}
                    >
                      {isPaid ? 'Undo' : 'Mark Paid ✓'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VendorListTab({ eventId, canManage, currency = 'INR' }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedVendorId, setExpandedVendorId] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'Other', contact_name: '', contact_email: '', contract_value: '' })

  const loadVendors = async () => {
    setLoading(true)
    try {
      const data = await vendorsApi.listVendors(eventId)
      setVendors(Array.isArray(data) ? data : [])
    } catch {
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVendors()
  }, [eventId])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await vendorsApi.createVendor({
        event_id: Number(eventId),
        name: form.name,
        category: form.category || 'Other',
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contract_value: Number(form.contract_value) || 0,
      })
      setForm({ name: '', category: 'Other', contact_name: '', contact_email: '', contract_value: '' })
      setShowForm(false)
      toast.success('Vendor added')
      loadVendors()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add vendor'))
    }
  }

  const handleDelete = async (id) => {
    if (!(await confirm('Delete this vendor contract?', { danger: true, confirmLabel: 'Delete' }))) return
    try {
      await vendorsApi.deleteVendor(id)
      toast.success('Vendor deleted')
      loadVendors()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete vendor'))
    }
  }

  const safeVendors = Array.isArray(vendors) ? vendors : []

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs active:scale-95 transition-all"
          >
            {showForm ? 'Cancel' : '+ Add Vendor Contract'}
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-rule rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Vendor Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-well border border-rule rounded px-3 py-2 text-sm text-ink" />
            <input placeholder="Category (e.g. Catering, Stage)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-well border border-rule rounded px-3 py-2 text-sm text-ink" />
            <input placeholder="Contact Person" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="bg-well border border-rule rounded px-3 py-2 text-sm text-ink" />
            <input placeholder="Contact Email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="bg-well border border-rule rounded px-3 py-2 text-sm text-ink" />
            <input type="number" step="0.01" placeholder="Contract Value" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} className="bg-well border border-rule rounded px-3 py-2 text-sm text-ink col-span-1 sm:col-span-2" />
          </div>
          <button type="submit" className="bg-primary-600 text-white font-semibold px-4 py-2 rounded-full text-sm hover:bg-primary-700">Save Vendor</button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : safeVendors.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-2xl p-10 text-center">
          <p className="text-3xl mb-2">🤝</p>
          <p className="text-sm text-ink/60">No active vendor contracts on the books yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeVendors.map((v) => {
            const isExpanded = expandedVendorId === v.id
            return (
              <div key={v.id} className="bg-card border border-rule rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-ink">{v.name}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-well rounded border border-rule text-ink/60">{v.category}</span>
                    </div>
                    <p className="text-xs text-ink/55 mt-0.5">
                      {v.contact_name} {v.contact_name && v.contact_email ? '·' : ''} {v.contact_email}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-ink/40">Contract Value</p>
                      <p className="figure text-lg font-bold text-ink">{formatMoney(v.contract_value, currency)}</p>
                    </div>

                    <button
                      onClick={() => setExpandedVendorId(isExpanded ? null : v.id)}
                      className="text-xs font-semibold px-3 py-1.5 border border-rule rounded-lg bg-well/60 hover:bg-well text-ink transition-colors"
                    >
                      {isExpanded ? 'Hide Milestones ▲' : '💸 Payment Milestones ▼'}
                    </button>

                    {canManage && (
                      <button onClick={() => handleDelete(v.id)} className="text-xs text-deficit-500 hover:text-deficit-600 font-semibold px-2 py-1">
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <VendorMilestoneTracker vendor={v} currency={currency} canManage={canManage} onUpdated={loadVendors} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VendorsContent({ eventId }) {
  const [tab, setTab] = useState('vendors')
  const { activeEvent } = useActiveEvent()
  const { canApproveBudget: canManage, loading } = useMyRole(eventId)
  const currency = activeEvent?.currency || 'INR'

  if (loading) return <div className="skeleton h-10 rounded-xl w-40" />

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Vendors & Payment Schedule</h2>
          <p className="text-sm text-ink/60 mt-1">
            Manage vendor contracts, multi-quote comparisons, and 30-50-20 staged payout milestones.
          </p>
        </div>
        <div className="flex items-center bg-card border border-rule p-1 rounded-full text-xs font-semibold shadow-xs">
          <button
            onClick={() => setTab('vendors')}
            className={`px-4 py-1.5 rounded-full transition-all ${
              tab === 'vendors' ? 'bg-primary-600 text-white shadow-xs' : 'text-ink/60 hover:text-ink'
            }`}
          >
            Vendor Contracts & Milestones
          </button>
          <button
            onClick={() => setTab('schedule')}
            className={`px-4 py-1.5 rounded-full transition-all ${
              tab === 'schedule' ? 'bg-primary-600 text-white shadow-xs' : 'text-ink/60 hover:text-ink'
            }`}
          >
            💸 Master Payout Schedule
          </button>
          <button
            onClick={() => setTab('quotes')}
            className={`px-4 py-1.5 rounded-full transition-all ${
              tab === 'quotes' ? 'bg-primary-600 text-white shadow-xs' : 'text-ink/60 hover:text-ink'
            }`}
          >
            Multi-Quote Bidding
          </button>
        </div>
      </div>

      {tab === 'vendors' && <VendorListTab eventId={eventId} canManage={canManage} currency={currency} />}
      {tab === 'schedule' && <MasterPayoutSchedule eventId={eventId} currency={currency} canManage={canManage} />}
      {tab === 'quotes' && <VendorQuoteComparison eventId={eventId} />}
    </div>
  )
}

export default function Vendors() {
  return <RequireActiveEvent>{(eventId) => <VendorsContent eventId={eventId} />}</RequireActiveEvent>
}
