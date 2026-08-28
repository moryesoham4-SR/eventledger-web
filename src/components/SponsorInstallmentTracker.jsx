import { useEffect, useState } from 'react'
import * as sponsorInstApi from '../api/sponsor_installments'
import { formatMoney } from './StatCard'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function SponsorInstallmentTracker({ sponsor, currency = 'INR', canManage, onUpdated }) {
  const toast = useToast()
  const [installments, setInstallments] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ installment_name: '', due_date: '', amount: '', notes: '' })

  const loadInstallments = async () => {
    if (!sponsor?.id) return
    setLoading(true)
    try {
      const data = await sponsorInstApi.getSponsorInstallments(sponsor.id)
      setInstallments(Array.isArray(data) ? data : [])
    } catch {
      setInstallments([])
    } fontally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInstallments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsor?.id])

  if (!sponsor) return null

  const totalCommitted = Number(sponsor.promised_amount || sponsor.amount || 0)
  const safeInstallments = Array.isArray(installments) ? installments : []
  const receivedInstallments = safeInstallments.filter((i) => i?.status === 'received')
  const totalReceived = receivedInstallments.reduce((sum, i) => sum + Number(i?.amount || 0), 0)
  const remainingReceivable = Math.max(0, totalCommitted - totalReceived)
  const pctReceived = totalCommitted > 0 ? Math.round((totalReceived / totalCommitted) * 100) : 0

  const handleAutoGenerate = async () => {
    if (totalCommitted <= 0) {
      toast.error('Set a committed deal amount greater than 0 first')
      return
    }
    setAutoGenerating(true)
    try {
      const data = await sponsorInstApi.autoGenerateSponsorInstallments(sponsor.id)
      setInstallments(Array.isArray(data) ? data : [])
      toast.success('Generated 50% Advance Deposit & 50% Settlement installments!')
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to generate installments'))
    } finally {
      setAutoGenerating(false)
    }
  }

  const handleCreateInstallment = async (e) => {
    e.preventDefault()
    try {
      const newInst = await sponsorInstApi.createSponsorInstallment({
        event_id: Number(sponsor.event_id),
        sponsor_id: Number(sponsor.id),
        installment_name: form.installment_name,
        due_date: form.due_date,
        amount: Number(form.amount),
        notes: form.notes,
        status: 'pending',
      })
      setInstallments((prev) => [...prev, newInst])
      setForm({ installment_name: '', due_date: '', amount: '', notes: '' })
      setShowForm(false)
      toast.success('Sponsor installment added')
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add installment'))
    }
  }

  const handleToggleStatus = async (inst) => {
    const nextStatus = inst.status === 'received' ? 'pending' : 'received'
    const today = new Date().toISOString().slice(0, 10)
    try {
      const updated = await sponsorInstApi.updateSponsorInstallment(inst.id, {
        status: nextStatus,
        received_date: nextStatus === 'received' ? today : null,
      })
      setInstallments((prev) => prev.map((item) => (item.id === inst.id ? updated : item)))
      toast.success(
        nextStatus === 'received'
          ? `Received ${formatMoney(inst.amount, currency)}! Synced to Actual Income 💰`
          : 'Installment marked back to Pending Receivable ⏳'
      )
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update installment status'))
    }
  }

  const handleDeleteInstallment = async (id) => {
    try {
      await sponsorInstApi.deleteSponsorInstallment(id)
      setInstallments((prev) => prev.filter((i) => i.id !== id))
      toast.success('Installment removed')
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove installment'))
    }
  }

  return (
    <div className="bg-well/40 border border-rule rounded-xl p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-display font-semibold text-ink text-sm flex items-center gap-2">
            🤝 Sponsor Staged Installments & Receivables
          </h4>
          <p className="text-[11px] text-ink/55 mt-0.5">
            Committed Deal: <strong className="text-ink">{formatMoney(totalCommitted, currency)}</strong> · Received (Logged in Income):{' '}
            <strong className="text-positive-400">{formatMoney(totalReceived, currency)} ({pctReceived}%)</strong> · Pending Receivable:{' '}
            <strong className="text-amber-400">{formatMoney(remainingReceivable, currency)}</strong>
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {safeInstallments.length === 0 && (
              <button
                onClick={handleAutoGenerate}
                disabled={autoGenerating}
                className="bg-primary-500/20 text-primary-400 border border-primary-500/30 font-semibold px-3 py-1 rounded-lg hover:bg-primary-500/30 transition-all text-xs"
              >
                {autoGenerating ? 'Generating...' : '⚡ Auto 50-50 Split'}
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-card border border-rule text-ink hover:border-primary-500/40 font-semibold px-3 py-1 rounded-lg transition-all text-xs"
            >
              {showForm ? 'Cancel' : '+ Add Installment'}
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="h-2 bg-well rounded-full overflow-hidden flex">
          <div className="h-full bg-positive-500 transition-all" style={{ width: `${Math.min(pctReceived, 100)}%` }} />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreateInstallment} className="bg-card border border-rule rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              placeholder="Installment Name (e.g. 50% Advance)"
              required
              value={form.installment_name}
              onChange={(e) => setForm({ ...form, installment_name: e.target.value })}
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
            Save Installment
          </button>
        </form>
      )}

      {/* Installments List */}
      {loading ? (
        <div className="skeleton h-16 rounded-lg" />
      ) : safeInstallments.length === 0 ? (
        <div className="p-3 text-center text-ink/40 bg-well/20 rounded-lg">
          No installments configured. Click <strong className="text-ink/60">⚡ Auto 50-50 Split</strong> to generate standard advance & settlement installments!
        </div>
      ) : (
        <div className="space-y-2">
          {safeInstallments.map((inst) => {
            const isReceived = inst.status === 'received'
            return (
              <div
                key={inst.id}
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-all ${
                  isReceived ? 'bg-positive-500/10 border-positive-500/20' : 'bg-card border-rule'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isReceived ? 'text-positive-300' : 'text-ink'}`}>{inst.installment_name}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isReceived ? 'bg-positive-500/20 text-positive-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {isReceived ? 'Received (In Income) ✓' : 'Pending Receivable ⏳'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink/50">
                    Due: {inst.due_date || 'TBD'} {inst.received_date ? `· Received on ${inst.received_date}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-ink text-sm">{formatMoney(inst.amount, currency)}</span>
                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleStatus(inst)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                          isReceived ? 'bg-well text-ink/70 hover:text-ink' : 'bg-positive-600 text-white hover:bg-positive-700 shadow-xs'
                        }`}
                      >
                        {isReceived ? 'Undo' : 'Mark Received ✓'}
                      </button>
                      <button onClick={() => handleDeleteInstallment(inst.id)} className="text-deficit-500 hover:text-deficit-600 text-xs px-1">
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
