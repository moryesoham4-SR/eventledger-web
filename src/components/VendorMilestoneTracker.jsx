import { useEffect, useState } from 'react'
import * as milestonesApi from '../api/vendor_milestones'
import { formatMoney } from './StatCard'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function VendorMilestoneTracker({ vendor, currency = 'INR', canManage, onUpdated }) {
  const toast = useToast()
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ milestone_name: '', due_date: '', amount: '', notes: '' })

  const loadMilestones = async () => {
    if (!vendor?.id) return
    setLoading(true)
    try {
      const data = await milestonesApi.getVendorMilestones(vendor.id)
      setMilestones(Array.isArray(data) ? data : [])
    } catch {
      setMilestones([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMilestones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.id])

  if (!vendor) return null

  const contractValue = Number(vendor.contract_value || 0)
  const safeMilestones = Array.isArray(milestones) ? milestones : []
  const paidMilestones = safeMilestones.filter((m) => m?.status === 'paid')
  const totalPaid = paidMilestones.reduce((sum, m) => sum + Number(m?.amount || 0), 0)
  const totalMilestoneAmt = safeMilestones.reduce((sum, m) => sum + Number(m?.amount || 0), 0)
  const remainingContract = Math.max(0, contractValue - totalPaid)
  const pctPaid = contractValue > 0 ? Math.round((totalPaid / contractValue) * 100) : 0

  const handleAutoGenerate = async () => {
    if (contractValue <= 0) {
      toast.error('Set a vendor contract value greater than 0 first')
      return
    }
    setAutoGenerating(true)
    try {
      const data = await milestonesApi.autoGenerateMilestones(vendor.id)
      setMilestones(Array.isArray(data) ? data : [])
      toast.success('Generated 30% Advance, 50% Setup & 20% Settlement milestones!')
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to generate milestones'))
    } finally {
      setAutoGenerating(false)
    }
  }

  const handleCreateMilestone = async (e) => {
    e.preventDefault()
    try {
      const newM = await milestonesApi.createVendorMilestone({
        event_id: Number(vendor.event_id),
        vendor_id: Number(vendor.id),
        milestone_name: form.milestone_name,
        due_date: form.due_date,
        amount: Number(form.amount),
        notes: form.notes,
        status: 'pending',
      })
      setMilestones((prev) => [...prev, newM])
      setForm({ milestone_name: '', due_date: '', amount: '', notes: '' })
      setShowForm(false)
      toast.success('Payment milestone added')
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add milestone'))
    }
  }

  const handleToggleStatus = async (m) => {
    const nextStatus = m.status === 'paid' ? 'pending' : 'paid'
    const today = new Date().toISOString().slice(0, 10)
    try {
      const updated = await milestonesApi.updateVendorMilestone(m.id, {
        status: nextStatus,
        paid_date: nextStatus === 'paid' ? today : null,
      })
      setMilestones((prev) => prev.map((item) => (item.id === m.id ? updated : item)))
      toast.success(`Milestone marked as ${nextStatus === 'paid' ? 'Paid ✓' : 'Pending ⏳'}`)
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update milestone status'))
    }
  }

  const handleDeleteMilestone = async (id) => {
    try {
      await milestonesApi.deleteVendorMilestone(id)
      setMilestones((prev) => prev.filter((m) => m.id !== id))
      toast.success('Milestone removed')
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove milestone'))
    }
  }

  return (
    <div className="bg-well/40 border border-rule rounded-xl p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-display font-semibold text-ink text-sm flex items-center gap-2">
            💸 Payment Milestone & Payout Schedule
          </h4>
          <p className="text-[11px] text-ink/55 mt-0.5">
            Total Contract: <strong className="text-ink">{formatMoney(contractValue, currency)}</strong> · Paid:{' '}
            <strong className="text-positive-400">{formatMoney(totalPaid, currency)} ({pctPaid}%)</strong> · Remaining:{' '}
            <strong className="text-amber-400">{formatMoney(remainingContract, currency)}</strong>
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {safeMilestones.length === 0 && (
              <button
                onClick={handleAutoGenerate}
                disabled={autoGenerating}
                className="bg-primary-500/20 text-primary-400 border border-primary-500/30 font-semibold px-3 py-1 rounded-lg hover:bg-primary-500/30 transition-all text-xs"
              >
                {autoGenerating ? 'Generating...' : '⚡ Auto 30-50-20 Split'}
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-card border border-rule text-ink hover:border-primary-500/40 font-semibold px-3 py-1 rounded-lg transition-all text-xs"
            >
              {showForm ? 'Cancel' : '+ Add Milestone'}
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="h-2 bg-well rounded-full overflow-hidden flex">
          <div className="h-full bg-positive-500 transition-all" style={{ width: `${Math.min(pctPaid, 100)}%` }} />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreateMilestone} className="bg-card border border-rule rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              placeholder="Milestone Title (e.g. 30% Advance)"
              required
              value={form.milestone_name}
              onChange={(e) => setForm({ ...form, milestone_name: e.target.value })}
              className="bg-well border border-rule rounded px-2.5 py-1.5 text-xs text-ink"
            />
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="bg-well border border-rule rounded px-2.5 py-1.5 text-xs text-ink"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="bg-well border border-rule rounded px-2.5 py-1.5 text-xs text-ink"
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white font-semibold px-3 py-1 rounded text-xs hover:bg-primary-700">
            Save Milestone
          </button>
        </form>
      )}

      {/* Milestones List */}
      {loading ? (
        <div className="skeleton h-16 rounded-lg" />
      ) : safeMilestones.length === 0 ? (
        <div className="p-3 text-center text-ink/40 bg-well/20 rounded-lg">
          No payment milestones defined. Click <strong className="text-ink/60">⚡ Auto 30-50-20 Split</strong> to generate standard advance deposit & setup payouts automatically!
        </div>
      ) : (
        <div className="space-y-2">
          {safeMilestones.map((m) => {
            const isPaid = m.status === 'paid'
            return (
              <div
                key={m.id}
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-all ${
                  isPaid ? 'bg-positive-500/10 border-positive-500/20' : 'bg-card border-rule'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isPaid ? 'text-positive-300' : 'text-ink'}`}>{m.milestone_name}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isPaid ? 'bg-positive-500/20 text-positive-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {isPaid ? 'Paid ✓' : 'Pending ⏳'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink/50">
                    Due: {m.due_date || 'TBD'} {m.paid_date ? `· Paid on ${m.paid_date}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-ink text-sm">{formatMoney(m.amount, currency)}</span>
                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleStatus(m)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                          isPaid ? 'bg-well text-ink/70 hover:text-ink' : 'bg-positive-600 text-white hover:bg-positive-700 shadow-xs'
                        }`}
                      >
                        {isPaid ? 'Undo' : 'Mark Paid ✓'}
                      </button>
                      <button onClick={() => handleDeleteMilestone(m.id)} className="text-deficit-500 hover:text-deficit-600 text-xs px-1">
                        ✕
                      </button>
                    </div>
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
