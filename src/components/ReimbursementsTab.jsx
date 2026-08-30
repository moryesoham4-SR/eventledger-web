import { useEffect, useState } from 'react'
import * as reimbursementsApi from '../api/reimbursements'
import * as departmentsApi from '../api/departments'
import { formatMoney } from './StatCard'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

export default function ReimbursementsTab({ eventId, role, currency = 'INR' }) {
  const toast = useToast()
  const { confirm, promptText } = useConfirm()

  const [claims, setClaims] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ department_id: '', item_name: '', category: 'General', amount: '', receipt_url: '', notes: '' })

  // Payout Modal
  const [payoutClaim, setPayoutClaim] = useState(null)
  const [payoutForm, setPayoutForm] = useState({ payment_mode: 'UPI', payout_reference: '', notes: '' })

  const loadData = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const [cData, dData] = await Promise.all([
        reimbursementsApi.listReimbursements(eventId),
        departmentsApi.listDepartments(eventId).catch(() => []),
      ])
      setClaims(Array.isArray(cData) ? cData : [])
      setDepartments(Array.isArray(dData) ? dData : [])
    } catch {
      setClaims([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [eventId])

  const handleSubmitClaim = async (e) => {
    e.preventDefault()
    if (!form.department_id || !form.item_name || !form.amount) {
      toast.error('Please fill in department, item name, and amount')
      return
    }
    setSubmitting(true)
    try {
      await reimbursementsApi.submitReimbursement({
        event_id: Number(eventId),
        department_id: Number(form.department_id),
        item_name: form.item_name,
        category: form.category || 'General',
        amount: Number(form.amount),
        receipt_url: form.receipt_url,
        notes: form.notes,
      })
      toast.success('Reimbursement claim submitted! Queued for Dept Head review.')
      setShowSubmitModal(false)
      setForm({ department_id: '', item_name: '', category: 'General', amount: '', receipt_url: '', notes: '' })
      loadData(true)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit claim'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeptHeadApprove = async (claimId, status) => {
    let notes = ''
    if (status === 'rejected') {
      const reason = await promptText('Reason for rejecting claim (compulsory):', {
        title: 'Reject Claim',
        placeholder: 'e.g. Invalid receipt or non-budgeted personal item',
        confirmLabel: 'Reject Claim',
        danger: true,
      })
      if (reason === null) return
      if (!reason.trim()) {
        toast.error('A written reason for rejection is compulsory!')
        return
      }
      notes = reason.trim()
    }
    try {
      await reimbursementsApi.deptHeadApproveClaim(claimId, { status, notes })
      toast.success(status === 'approved' ? 'Claim verified by Dept Head! Sent to Finance for final payout.' : 'Claim rejected')
      loadData(true)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update claim verification'))
    }
  }

  const handleFinancePayoutSubmit = async (e) => {
    e.preventDefault()
    if (!payoutClaim) return
    try {
      await reimbursementsApi.financeHeadPayoutClaim(payoutClaim.id, {
        status: 'paid_out',
        payment_mode: payoutForm.payment_mode,
        payout_reference: payoutForm.payout_reference,
        notes: payoutForm.notes,
      })
      toast.success(`Claim for ₹${payoutClaim.amount} APPROVED & PAID OUT! Synced to Actual Expenses 💰`)
      setPayoutClaim(null)
      loadData(true)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to process finance payout'))
    }
  }

  const handleDeleteClaim = async (claimId) => {
    if (!(await confirm('Delete/withdraw this reimbursement claim?', { danger: true, confirmLabel: 'Delete' }))) return
    try {
      await reimbursementsApi.deleteReimbursement(claimId)
      toast.success('Claim deleted')
      loadData(true)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete claim'))
    }
  }

  const isFinanceHead = role.level === 'event_admin' || role.level === 'finance_head' || Boolean(role.is_super_admin)
  const safeClaims = Array.isArray(claims) ? claims : []
  const pendingDeptCount = safeClaims.filter((c) => c.dept_head_status === 'pending').length
  const pendingFinanceCount = safeClaims.filter((c) => c.dept_head_status === 'approved' && c.finance_status !== 'paid_out').length
  const paidOutTotal = safeClaims.filter((c) => c.finance_status === 'paid_out').reduce((sum, c) => sum + Number(c.amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
          <p className="text-xs font-semibold uppercase tracking-wider">Stage 1: Pending Dept Review</p>
          <p className="text-xl font-bold mt-1">{pendingDeptCount} Claims</p>
        </div>
        <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl text-primary-300">
          <p className="text-xs font-semibold uppercase tracking-wider">Stage 2: Pending Finance Payout</p>
          <p className="text-xl font-bold mt-1">{pendingFinanceCount} Claims</p>
        </div>
        <div className="p-4 bg-positive-500/10 border border-positive-500/30 rounded-xl text-positive-300">
          <p className="text-xs font-semibold uppercase tracking-wider">Settled & Paid Out (In Expenses)</p>
          <p className="text-xl font-bold mt-1">{formatMoney(paidOutTotal, currency)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
          📥 Co-Worker Cash Reimbursement Queue
        </h3>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>+</span> Claim Reimbursement
        </button>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="skeleton h-48 rounded-xl" />
      ) : safeClaims.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-8 text-center">
          <p className="text-2xl mb-2">📥</p>
          <p className="text-xs text-ink/60">No co-worker reimbursement claims submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {safeClaims.map((claim) => {
            const isDeptHeadOfThis = role.level === 'dept_head' && String(role.deptId) === String(claim.department_id)
            const canDeptReview = claim.dept_head_status === 'pending' && (role.level === 'event_admin' || isDeptHeadOfThis || role.is_super_admin)
            const canFinanceReview = claim.dept_head_status === 'approved' && claim.finance_status !== 'paid_out' && isFinanceHead
            const canDelete = claim.claimed_by_user_id === role.userId || role.level === 'event_admin' || role.is_super_admin

            return (
              <div key={claim.id} className="bg-card border border-rule rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-ink">{claim.item_name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded text-white" style={{ backgroundColor: claim.dept_color || '#6366f1' }}>
                      {claim.dept_name}
                    </span>
                    <span className="text-xs text-ink/50">({claim.category})</span>
                  </div>

                  <p className="text-xs text-ink/60">
                    Claimant: <strong className="text-ink">{claim.claimed_by_name}</strong>
                    {claim.notes && ` · Notes: ${claim.notes}`}
                  </p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                      claim.dept_head_status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      claim.dept_head_status === 'rejected' ? 'bg-deficit-500/20 text-deficit-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      Stage 1 (Dept): {claim.dept_head_status}
                    </span>

                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                      claim.finance_status === 'paid_out' ? 'bg-emerald-500/20 text-emerald-400' :
                      claim.finance_status === 'rejected' ? 'bg-deficit-500/20 text-deficit-400' :
                      'bg-primary-500/20 text-primary-400'
                    }`}>
                      Stage 2 (Finance): {claim.finance_status === 'paid_out' ? `Paid (${claim.payment_mode})` : claim.finance_status}
                    </span>

                    {claim.payout_reference && (
                      <span className="text-ink/60 font-mono">Ref/UTR: {claim.payout_reference}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-rule justify-between md:justify-end">
                  <span className="figure text-lg font-bold text-primary-400">{formatMoney(claim.amount, currency)}</span>

                  <div className="flex items-center gap-2">
                    {canDeptReview && (
                      <>
                        <button
                          onClick={() => handleDeptHeadApprove(claim.id, 'rejected')}
                          className="px-3 py-1 border border-deficit-500/40 text-deficit-400 hover:bg-deficit-500/10 rounded-lg text-xs font-semibold transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleDeptHeadApprove(claim.id, 'approved')}
                          className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                        >
                          Verify Claim ✓
                        </button>
                      </>
                    )}

                    {canFinanceReview && (
                      <button
                        onClick={() => {
                          setPayoutClaim(claim)
                          setPayoutForm({ payment_mode: 'UPI', payout_reference: '', notes: '' })
                        }}
                        className="px-3.5 py-1.5 bg-positive-600 hover:bg-positive-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                      >
                        Process Payout 💰
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteClaim(claim.id)}
                        className="text-deficit-400 hover:text-deficit-500 text-xs px-2 py-1 font-semibold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Submit Claim Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-5 border-b border-rule flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">📥 Submit Reimbursement Claim</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-ink/40 hover:text-ink text-xl font-bold px-2">✕</button>
            </div>

            <form onSubmit={handleSubmitClaim} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Department *</label>
                <select
                  required
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                >
                  <option value="">Select department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink/70 mb-1">Item Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stage Cables & Tape"
                    value={form.item_name}
                    onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/70 mb-1">Amount Spent (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500 font-bold text-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Bill / Receipt URL (Drive or Imgur link)</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={form.receipt_url}
                  onChange={(e) => setForm({ ...form, receipt_url: e.target.value })}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Payment details, shop name, or urgent reasons..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div className="p-4 border-t border-rule bg-well/30 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="text-xs font-semibold px-4 py-2 border border-rule rounded-xl bg-card text-ink hover:border-ink/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finance Payout Modal */}
      {payoutClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-rule flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">💰 Process Finance Payout</h3>
                <p className="text-xs text-ink/60">Claimant: {payoutClaim.claimed_by_name} ({formatMoney(payoutClaim.amount, currency)})</p>
              </div>
              <button onClick={() => setPayoutClaim(null)} className="text-ink/40 hover:text-ink text-xl font-bold px-2">✕</button>
            </div>

            <form onSubmit={handleFinancePayoutSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Payment Method</label>
                <select
                  value={payoutForm.payment_mode}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payment_mode: e.target.value })}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                >
                  <option value="UPI">Google Pay / PhonePe / Paytm (UPI)</option>
                  <option value="Cash">Cash Handout</option>
                  <option value="Bank Transfer">NEFT / IMPS Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Transaction Ref / UPI UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-402910482019"
                  value={payoutForm.payout_reference}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payout_reference: e.target.value })}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Finance Notes</label>
                <textarea
                  rows={2}
                  placeholder="Bank account note or payout voucher number..."
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-xs bg-card text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div className="p-4 border-t border-rule bg-well/30 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setPayoutClaim(null)}
                  className="text-xs font-semibold px-4 py-2 border border-rule rounded-xl bg-card text-ink hover:border-ink/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-positive-600 hover:bg-positive-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs"
                >
                  Confirm Payout & Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
