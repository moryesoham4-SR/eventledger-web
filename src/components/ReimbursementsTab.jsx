import { useEffect, useState } from 'react'
import * as reimbursementsApi from '../api/reimbursements'
import * as departmentsApi from '../api/departments'
import { formatMoney } from './StatCard'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

export default function ReimbursementsTab({ eventId, role, currency = 'INR' }) {
  const toast = useToast()
  const { confirm } = useConfirm()

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
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit claim'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeptHeadApprove = async (claimId, status) => {
    try {
      await reimbursementsApi.deptHeadApproveClaim(claimId, { status, notes: '' })
      toast.success(status === 'approved' ? 'Claim verified by Dept Head! Sent to Finance for final payout.' : 'Claim rejected')
      loadData()
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
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to process finance payout'))
    }
  }

  const handleDeleteClaim = async (claimId) => {
    if (!(await confirm('Delete/withdraw this reimbursement claim?', { danger: true, confirmLabel: 'Delete' }))) return
    try {
      await reimbursementsApi.deleteReimbursement(claimId)
      toast.success('Claim deleted')
      loadData()
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
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">📥</p>
          <p className="text-sm text-ink/60">No reimbursement claims submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeClaims.map((c) => {
            const isDeptApproved = c.dept_head_status === 'approved'
            const isDeptRejected = c.dept_head_status === 'rejected'
            const isPaidOut = c.finance_status === 'paid_out'
            const isFinanceRejected = c.finance_status === 'rejected'
            const canDeptApprove = (role.level === 'dept_head' && String(role.deptId) === String(c.department_id)) || isFinanceHead

            return (
              <div key={c.id} className="lift bg-card border border-rule rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display text-base font-bold text-ink">{c.item_name}</h4>
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-primary-500/15 text-primary-400 rounded-full border border-primary-500/30">
                        🏢 {c.dept_name}
                      </span>
                      <span className="text-xs text-ink/50 font-medium">({c.category})</span>
                    </div>

                    <p className="text-xs text-ink/60">
                      Claimed by: <strong className="text-ink">{c.claimed_by_name}</strong> ({c.user_email})
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Claim Amount</p>
                    <p className="figure text-xl font-bold text-ink">{formatMoney(c.amount, currency)}</p>
                  </div>
                </div>

                {/* Receipt Image / Proof Link */}
                {c.receipt_url && (
                  <div className="p-2.5 bg-well/40 border border-rule rounded-xl flex items-center justify-between text-xs">
                    <span className="text-ink/70 font-medium flex items-center gap-1.5">
                      🧾 Receipt Attachment:
                    </span>
                    <a
                      href={c.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:underline font-semibold"
                    >
                      View Receipt File / Image ↗
                    </a>
                  </div>
                )}

                {/* 2-Stage Approval Badges & Action Buttons */}
                <div className="p-3 bg-well/30 rounded-xl border border-rule flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    {/* Stage 1 Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink/50 font-medium">1️⃣ Dept Head:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        isDeptApproved ? 'bg-positive-500/20 text-positive-400' : isDeptRejected ? 'bg-deficit-500/20 text-deficit-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {isDeptApproved ? 'Verified ✓' : isDeptRejected ? 'Rejected ✕' : 'Pending Verification ⏳'}
                      </span>
                    </div>

                    {/* Stage 2 Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink/50 font-medium">2️⃣ Finance Head:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        isPaidOut ? 'bg-positive-500/20 text-positive-400' : isFinanceRejected ? 'bg-deficit-500/20 text-deficit-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {isPaidOut ? `Paid Out (${c.payment_mode}) ✓` : isFinanceRejected ? 'Rejected ✕' : 'Pending Payout ⏳'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Dept Head Verification Action */}
                    {!isPaidOut && canDeptApprove && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDeptHeadApprove(c.id, 'approved')}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${
                            isDeptApproved ? 'bg-well text-ink/50' : 'bg-positive-600 text-white hover:bg-positive-700 shadow-xs'
                          }`}
                        >
                          {isDeptApproved ? 'Dept Verified ✓' : 'Verify Claim ✓'}
                        </button>
                      </div>
                    )}

                    {/* Finance Head Payout Action */}
                    {isFinanceHead && isDeptApproved && !isPaidOut && (
                      <button
                        onClick={() => {
                          setPayoutClaim(c)
                          setPayoutForm({ payment_mode: 'UPI', payout_reference: '', notes: '' })
                        }}
                        className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-xs transition-all flex items-center gap-1"
                      >
                        <span>💰</span> Approve & Pay Out
                      </button>
                    )}

                    <button onClick={() => handleDeleteClaim(c.id)} className="text-xs text-deficit-500 hover:text-deficit-600 px-2 py-1">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Claim Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-ink">Submit Reimbursement Claim</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Department *</label>
                <select
                  required
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink font-semibold"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      🏢 {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Item / Expense Name *</label>
                <input
                  required
                  placeholder="e.g. 50m Heavy Duty Stage Tape"
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Amount Spent (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 800"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Category</label>
                  <input
                    placeholder="e.g. Equipment, Props"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Receipt Image URL / File Link</label>
                <input
                  placeholder="https://... (or Google Drive/Cloud receipt link)"
                  value={form.receipt_url}
                  onChange={(e) => setForm({ ...form, receipt_url: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-rule">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="px-4 py-2 text-xs font-semibold text-ink/60 hover:text-ink">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs">
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finance Payout Modal */}
      {payoutClaim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-ink">Finance Payout Sign-Off</h3>
              <button onClick={() => setPayoutClaim(null)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <div className="bg-well/40 p-3 rounded-xl border border-rule text-xs space-y-1">
              <p className="text-ink/60">Paying Out Claim To: <strong className="text-ink">{payoutClaim.claimed_by_name}</strong></p>
              <p className="text-ink/60">Item: <strong className="text-ink">{payoutClaim.item_name}</strong> (🏢 {payoutClaim.dept_name})</p>
              <p className="text-ink/60">Payout Amount: <strong className="text-positive-400 font-bold text-sm">{formatMoney(payoutClaim.amount, currency)}</strong></p>
            </div>

            <form onSubmit={handleFinancePayoutSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Payment Mode *</label>
                <select
                  value={payoutForm.payment_mode}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payment_mode: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink font-semibold"
                >
                  <option value="UPI">📲 UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Transaction UTR / Reference Number</label>
                <input
                  placeholder="e.g. UTR 423910291 or Voucher #102"
                  value={payoutForm.payout_reference}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payout_reference: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-rule">
                <button type="button" onClick={() => setPayoutClaim(null)} className="px-4 py-2 text-xs font-semibold text-ink/60 hover:text-ink">
                  Cancel
                </button>
                <button type="submit" className="bg-positive-600 hover:bg-positive-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs">
                  Confirm Payout & Log to Expenses ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
