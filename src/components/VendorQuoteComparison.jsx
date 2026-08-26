import { useState, useEffect } from 'react'
import * as quotesApi from '../api/vendor_quotes'
import { formatMoney } from './StatCard'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

export default function VendorQuoteComparison({ proposalId, currency = 'INR', canEdit = false, onQuotesUpdated }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [form, setForm] = useState({
    vendor_name: '',
    contact_info: '',
    quote_amount: '',
    deliverables: '',
    terms: '',
    notes: '',
  })

  const loadQuotes = async () => {
    try {
      setLoading(true)
      const data = await quotesApi.getProposalQuotes(proposalId)
      setQuotes(data || [])
      onQuotesUpdated?.(data || [])
    } catch {
      toast.error("Couldn't load vendor quotes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (proposalId) loadQuotes()
  }, [proposalId])

  const handleAddQuote = async (e) => {
    e.preventDefault()
    if (!form.vendor_name || !form.quote_amount) {
      toast.error('Please enter vendor name and quoted amount')
      return
    }
    try {
      setSubmitting(true)
      await quotesApi.addVendorQuote(proposalId, {
        ...form,
        quote_amount: Number(form.quote_amount),
      })
      toast.success('Vendor quote added')
      setForm({ vendor_name: '', contact_info: '', quote_amount: '', deliverables: '', terms: '', notes: '' })
      setShowAddModal(false)
      loadQuotes()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Couldn't add vendor quote")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectQuote = async (quoteId) => {
    try {
      await quotesApi.selectVendorQuote(proposalId, quoteId)
      toast.success('Recommended vendor quote selected')
      loadQuotes()
    } catch {
      toast.error("Couldn't update selected quote")
    }
  }

  const handleDeleteQuote = async (quoteId) => {
    if (!(await confirm('Delete this vendor quote?', { danger: true, confirmLabel: 'Delete' }))) return
    try {
      await quotesApi.deleteVendorQuote(proposalId, quoteId)
      toast.success('Quote deleted')
      loadQuotes()
    } catch {
      toast.error("Couldn't delete quote")
    }
  }

  // Calculate lowest quote among list
  const validAmounts = quotes.map((q) => Number(q.quote_amount)).filter((a) => a > 0)
  const minAmount = validAmounts.length > 0 ? Math.min(...validAmounts) : null
  const maxAmount = validAmounts.length > 0 ? Math.max(...validAmounts) : null
  const savings = maxAmount && minAmount && maxAmount > minAmount ? maxAmount - minAmount : 0

  return (
    <div className="mt-6 border-t border-rule/60 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-display font-semibold text-ink text-base">📊 Multi-Quote Vendor Comparison</h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              {quotes.length} {quotes.length === 1 ? 'Quote' : 'Quotes'}
            </span>
          </div>
          <p className="text-xs text-ink/60 mt-0.5">
            Upload and compare 2-3 vendor quotes side-by-side before submitting or approving the budget.
          </p>
        </div>

        {canEdit && quotes.length < 5 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Add Vendor Quote</span>
          </button>
        )}
      </div>

      {/* Savings Summary Banner */}
      {savings > 0 && quotes.length >= 2 && (
        <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span>💡 <strong>Side-by-side Insight:</strong> Selecting the lowest quote saves up to <strong>{formatMoney(savings, currency)}</strong> vs highest quote.</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="h-44 skeleton rounded-xl" />
          <div className="h-44 skeleton rounded-xl" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="bg-well/50 border border-dashed border-rule rounded-xl p-6 text-center">
          <p className="text-sm text-ink/60 font-medium">No vendor quotes added yet for comparison.</p>
          <p className="text-xs text-ink/40 mt-1">Add 2 to 3 quotes to evaluate prices, deliverables, and payment terms.</p>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-xs font-semibold text-primary-600 hover:underline"
            >
              + Add First Vendor Quote
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotes.map((q) => {
            const isLowest = minAmount && Number(q.quote_amount) === minAmount && quotes.length >= 2
            const isSelected = Boolean(q.is_selected)

            return (
              <div
                key={q.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 shadow-sm ring-1 ring-emerald-500/50'
                    : 'bg-card border-rule hover:border-primary-300'
                }`}
              >
                {/* Badges top right */}
                <div className="flex items-center gap-1.5 absolute top-3 right-3">
                  {isLowest && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-full">
                      🏆 Lowest Price
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-sm">
                      ✓ Selected Quote
                    </span>
                  )}
                </div>

                <div>
                  <h5 className="font-display font-bold text-ink text-base pr-20">{q.vendor_name}</h5>
                  {q.contact_info && <p className="text-xs text-ink/50 mt-0.5">{q.contact_info}</p>}

                  <div className="mt-3 bg-well rounded-lg p-2.5 border border-rule/50">
                    <span className="text-[11px] text-ink/50 font-medium block">Quoted Amount</span>
                    <span className="text-xl font-bold font-display text-primary-600 dark:text-primary-400">
                      {formatMoney(q.quote_amount, currency)}
                    </span>
                  </div>

                  {q.deliverables && (
                    <div className="mt-3 text-xs">
                      <span className="font-semibold text-ink/70">Deliverables / Scope:</span>
                      <p className="text-ink/80 whitespace-pre-wrap mt-0.5">{q.deliverables}</p>
                    </div>
                  )}

                  {q.terms && (
                    <div className="mt-2 text-xs">
                      <span className="font-semibold text-ink/70">Terms / Notes:</span>
                      <p className="text-ink/70 whitespace-pre-wrap mt-0.5">{q.terms}</p>
                    </div>
                  )}
                </div>

                {/* Actions footer */}
                <div className="mt-4 pt-3 border-t border-rule/40 flex items-center justify-between gap-2">
                  {canEdit ? (
                    !isSelected ? (
                      <button
                        onClick={() => handleSelectQuote(q.id)}
                        className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg transition-all active:scale-95"
                      >
                        Select Quote
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span>✓ Recommended Choice</span>
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-ink/50 italic">
                      {isSelected ? '✓ Recommended Choice' : 'Candidate Quote'}
                    </span>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => handleDeleteQuote(q.id)}
                      className="text-xs text-deficit-500 hover:text-deficit-700 px-1.5 py-1 rounded hover:bg-deficit-50 dark:hover:bg-deficit-950/40"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal for adding vendor quote */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-rule rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in">
            <h3 className="font-display text-lg font-semibold text-ink mb-1">Add Vendor Quote for Comparison</h3>
            <p className="text-xs text-ink/60 mb-4">Enter quotes received from vendors to evaluate side-by-side.</p>

            <form onSubmit={handleAddQuote} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1">Vendor Name *</label>
                <input
                  required
                  placeholder="e.g. Acme Audio Visuals"
                  value={form.vendor_name}
                  onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink/70 mb-1">Quoted Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={form.quote_amount}
                    onChange={(e) => setForm({ ...form, quote_amount: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/70 mb-1">Contact Info (Optional)</label>
                  <input
                    placeholder="e.g. john@acme.com"
                    value={form.contact_info}
                    onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1">Deliverables & Scope</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 2 LED walls, 4 Wireless mics, 1 Sound Engineer"
                  value={form.deliverables}
                  onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1">Terms / Payment Notes</label>
                <input
                  placeholder="e.g. 50% advance, 50% post-event"
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-ink/70 border border-rule rounded-lg hover:bg-well"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all"
                >
                  {submitting ? 'Adding...' : 'Add Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
