import { useState, useEffect } from 'react'
import * as sponsorsApi from '../api/sponsors'
import * as sponsorshipApi from '../api/sponsorship'
import * as sponsorInstApi from '../api/sponsor_installments'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useMyRole } from '../hooks/useMyRole'
import { useActiveEvent } from '../context/EventContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { getErrorMessage } from '../api/client'
import SponsorInstallmentTracker from '../components/SponsorInstallmentTracker'

const TIER_COLORS = {
  Title: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700',
  Gold: 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/70 dark:text-yellow-200 dark:border-yellow-700',
  Silver: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-600',
  Bronze: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/70 dark:text-orange-200 dark:border-orange-700',
}

const TIER_ICONS = {
  Title: '👑',
  Gold: '🥇',
  Silver: '🥈',
  Bronze: '🥉',
}

function MasterSponsorReceivables({ eventId, currency = 'INR', canManage, onUpdated }) {
  const toast = useToast()
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)

  const loadSchedule = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const data = await sponsorInstApi.getEventSponsorReceivables(eventId)
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
  const pendingItems = safeSchedule.filter((i) => i.status === 'pending')
  const receivedItems = safeSchedule.filter((i) => i.status === 'received')
  const totalPending = pendingItems.reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalReceived = receivedItems.reduce((s, i) => s + Number(i.amount || 0), 0)

  const handleToggleStatus = async (inst) => {
    const nextStatus = inst.status === 'received' ? 'pending' : 'received'
    const today = new Date().toISOString().slice(0, 10)
    try {
      await sponsorInstApi.updateSponsorInstallment(inst.id, {
        status: nextStatus,
        received_date: nextStatus === 'received' ? today : null,
      })
      toast.success(
        nextStatus === 'received'
          ? `Received ${formatMoney(inst.amount, currency)}! Synced to Actual Income 💰`
          : 'Installment marked back to Pending Receivable ⏳'
      )
      loadSchedule()
      onUpdated?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-card border border-rule rounded-xl">
          <p className="text-xs text-ink/50 font-semibold uppercase tracking-wider">Scheduled Receivables</p>
          <p className="text-xl font-bold text-ink mt-1">{safeSchedule.length} Installments</p>
        </div>
        <div className="p-4 bg-positive-500/10 border border-positive-500/30 rounded-xl text-positive-300">
          <p className="text-xs font-semibold uppercase tracking-wider">Received (In Income)</p>
          <p className="text-xl font-bold mt-1">{formatMoney(totalReceived, currency)}</p>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
          <p className="text-xs font-semibold uppercase tracking-wider">Pending Receivables</p>
          <p className="text-xl font-bold mt-1">{formatMoney(totalPending, currency)}</p>
        </div>
      </div>

      {safeSchedule.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🤝</p>
          <p className="text-sm text-ink/60">No sponsor receivable installments scheduled yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-xl overflow-hidden divide-y divide-rule">
          {safeSchedule.map((inst) => {
            const isReceived = inst.status === 'received'
            return (
              <div key={inst.id} className="p-4 flex items-center justify-between gap-3 hover:bg-well/30 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink text-sm">{inst.sponsor_name}</span>
                    <span className="text-xs text-ink/50">({inst.sponsor_tier})</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${isReceived ? 'bg-positive-500/20 text-positive-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {isReceived ? 'Received (In Income) ✓' : 'Pending Receivable ⏳'}
                    </span>
                  </div>
                  <p className="text-xs text-ink/70 font-medium">{inst.installment_name}</p>
                  <p className="text-[11px] text-ink/50">Due Date: {inst.due_date || 'TBD'} {inst.received_date ? `· Received on ${inst.received_date}` : ''}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-ink text-base">{formatMoney(inst.amount, currency)}</span>
                  {canManage && (
                    <button
                      onClick={() => handleToggleStatus(inst)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isReceived ? 'bg-well text-ink/70 hover:text-ink' : 'bg-positive-600 text-white hover:bg-positive-700 shadow-xs'
                      }`}
                    >
                      {isReceived ? 'Undo' : 'Mark Received ✓'}
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

function SponsorDeliverables({ sponsorId, canManage }) {
  const toast = useToast()
  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const data = await sponsorshipApi.getSponsorDeliverables(sponsorId)
      setDeliverables(Array.isArray(data) ? data : [])
    } catch {
      setDeliverables([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sponsorId) load()
  }, [sponsorId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await sponsorshipApi.addSponsorDeliverable(sponsorId, { title: title.trim() })
      setTitle('')
      setShowAdd(false)
      toast.success('Deliverable item added')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't add deliverable"))
    }
  }

  const handleToggle = async (id) => {
    try {
      await sponsorshipApi.toggleDeliverableStatus(id)
      load()
    } catch {
      toast.error("Couldn't update deliverable status")
    }
  }

  const handleDelete = async (id) => {
    try {
      await sponsorshipApi.deleteSponsorDeliverable(id)
      toast.success('Deliverable removed')
      load()
    } catch {
      toast.error("Couldn't remove deliverable")
    }
  }

  return (
    <div className="pt-2 border-t border-rule mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink/50">Sponsor Deliverables & Perks</h4>
        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-[11px] text-primary-500 hover:text-primary-400 font-semibold"
          >
            {showAdd ? 'Cancel' : '+ Add Perk'}
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Logo on Main Stage Banner"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-well border border-rule rounded px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-primary-500"
          />
          <button
            type="submit"
            className="bg-primary-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-primary-700"
          >
            Add
          </button>
        </form>
      )}

      {loading ? (
        <div className="h-6 skeleton rounded my-1" />
      ) : deliverables.length === 0 ? (
        <p className="text-[11px] text-ink/40 italic">No deliverables added for this sponsor yet.</p>
      ) : (
        <div className="space-y-1">
          {deliverables.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-xs py-0.5 group">
              <label className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={d.status === 'completed'}
                  onChange={() => handleToggle(d.id)}
                  className="rounded border-rule text-emerald-600 focus:ring-emerald-500"
                />
                <span className={d.status === 'completed' ? 'line-through text-ink/40' : 'text-ink/80 font-medium'}>
                  {d.title}
                </span>
              </label>
              {canManage && (
                <button
                  onClick={() => handleDelete(d.id)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-deficit-500 hover:text-deficit-700"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SponsorsContent({ eventId }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const { activeEvent } = useActiveEvent()
  const { canApproveBudget: canManage } = useMyRole(eventId)
  const currency = activeEvent?.currency || 'INR'
  const [tab, setTab] = useState('sponsors')
  const [sponsors, setSponsors] = useState([])
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedSponsorId, setExpandedSponsorId] = useState(null)

  const [form, setForm] = useState({
    name: '',
    tier: 'Gold Sponsor',
    contact_name: '',
    contact_email: '',
    promised_amount: '',
    amount_received: '',
    notes: '',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [sData, tData] = await Promise.all([
        sponsorsApi.listSponsors(eventId),
        sponsorshipApi.getSponsorshipTiers(eventId),
      ])
      setSponsors(Array.isArray(sData) ? sData : [])
      setTiers(Array.isArray(tData) ? tData : [])
    } catch {
      setSponsors([])
      setTiers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (eventId) loadData()
  }, [eventId])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.promised_amount) {
      toast.error('Please enter sponsor name and total committed deal amount')
      return
    }
    try {
      setSubmitting(true)
      await sponsorsApi.createSponsor({
        event_id: Number(eventId),
        name: form.name,
        tier: form.tier,
        contact_name: form.contact_name || '',
        contact_email: form.contact_email || '',
        promised_amount: Number(form.promised_amount) || 0,
        amount_received: Number(form.amount_received) || 0,
        status: 'confirmed',
        notes: form.notes || '',
      })
      toast.success('Sponsor added! Received deposit synced to Income ledger')
      setShowModal(false)
      setForm({ name: '', tier: 'Gold Sponsor', contact_name: '', contact_email: '', promised_amount: '', amount_received: '', notes: '' })
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't add sponsor"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSponsor = async (id) => {
    if (!(await confirm('Delete this sponsor entry and sync out its income entries?', { danger: true, confirmLabel: 'Delete' }))) return
    try {
      await sponsorsApi.deleteSponsor(id)
      toast.success('Sponsor deleted')
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete sponsor"))
    }
  }

  const safeSponsors = Array.isArray(sponsors) ? sponsors : []
  const filteredSponsors = safeSponsors.filter((s) => {
    if (!s) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (s.name && String(s.name).toLowerCase().includes(q)) ||
      (s.tier && String(s.tier).toLowerCase().includes(q)) ||
      (s.contact_name && String(s.contact_name).toLowerCase().includes(q)) ||
      (s.contact_email && String(s.contact_email).toLowerCase().includes(q))
    )
  })

  const totalCommitted = safeSponsors.reduce((sum, s) => sum + Number(s.promised_amount || s.amount || 0), 0)
  const totalReceived = safeSponsors.reduce((sum, s) => sum + Number(s.amount_received || 0), 0)
  const totalPending = Math.max(0, totalCommitted - totalReceived)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Sponsors & Receivables</h2>
          <p className="text-xs text-ink/55 mt-0.5">
            Committed Deals: <span className="font-bold text-ink">{formatMoney(totalCommitted, currency)}</span> · Received (In Income):{' '}
            <span className="font-bold text-positive-400">{formatMoney(totalReceived, currency)}</span> · Pending Receivables:{' '}
            <span className="font-bold text-amber-400">{formatMoney(totalPending, currency)}</span>
          </p>
        </div>

        <div className="flex items-center bg-card border border-rule p-1 rounded-full text-xs font-semibold shadow-xs">
          <button
            onClick={() => setTab('sponsors')}
            className={`px-4 py-1.5 rounded-full transition-all ${
              tab === 'sponsors' ? 'bg-primary-600 text-white shadow-xs' : 'text-ink/60 hover:text-ink'
            }`}
          >
            Sponsors & Deliverables
          </button>
          <button
            onClick={() => setTab('receivables')}
            className={`px-4 py-1.5 rounded-full transition-all ${
              tab === 'receivables' ? 'bg-primary-600 text-white shadow-xs' : 'text-ink/60 hover:text-ink'
            }`}
          >
            🤝 Master Receivables Schedule
          </button>
        </div>
      </div>

      {tab === 'receivables' && (
        <MasterSponsorReceivables eventId={eventId} currency={currency} canManage={canManage} onUpdated={loadData} />
      )}

      {tab === 'sponsors' && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-4 rounded-2xl border border-rule shadow-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="Search sponsors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-well border border-rule rounded-full px-3.5 py-1.5 pl-8 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-primary-500 w-44 sm:w-64 transition-all"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 text-xs">🔍</span>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-xs">
                  ✕
                </button>
              )}
            </div>

            {canManage && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>+</span> Add Sponsor Deal
              </button>
            )}
          </div>

          {/* Sponsor Creation Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-card border border-rule rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-rule pb-3">
                  <h3 className="font-display text-lg font-bold text-ink">Add New Sponsor Deal</h3>
                  <button onClick={() => setShowModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
                </div>

                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-ink/70 block mb-1">Sponsor Organization Name *</label>
                    <input
                      required
                      placeholder="e.g. Red Bull, Google, TechCorp"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-ink/70 block mb-1">Sponsorship Tier</label>
                    <select
                      value={form.tier}
                      onChange={(e) => setForm({ ...form, tier: e.target.value })}
                      className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink font-semibold"
                    >
                      <option value="Title Sponsor">👑 Title Sponsor</option>
                      <option value="Gold Sponsor">🥇 Gold Sponsor</option>
                      <option value="Silver Sponsor">🥈 Silver Sponsor</option>
                      <option value="Bronze Sponsor">🥉 Bronze Sponsor</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-semibold text-ink/70 block mb-1">Total Committed Deal (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 100000"
                        value={form.promised_amount}
                        onChange={(e) => setForm({ ...form, promised_amount: e.target.value })}
                        className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink/70 block mb-1">Initial Cash Received (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 50000 (or 0 if pending)"
                        value={form.amount_received}
                        onChange={(e) => setForm({ ...form, amount_received: e.target.value })}
                        className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-ink/50 italic">
                    💡 <strong>Note:</strong> ONLY the initial cash received (if any) will be logged in Actual Income. The remaining balance stays as Pending Receivable!
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-semibold text-ink/70 block mb-1">Contact Person</label>
                      <input
                        placeholder="e.g. John Doe"
                        value={form.contact_name}
                        onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                        className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink/70 block mb-1">Contact Email</label>
                      <input
                        type="email"
                        placeholder="john@sponsor.com"
                        value={form.contact_email}
                        onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                        className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-rule">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-semibold text-ink/60 hover:text-ink">
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting} className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs">
                      {submitting ? 'Saving...' : 'Save Sponsor Deal'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Sponsors Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="skeleton h-48 rounded-2xl" />
              <div className="skeleton h-48 rounded-2xl" />
            </div>
          ) : filteredSponsors.length === 0 ? (
            <div className="bg-card border border-dashed border-rule rounded-2xl p-10 text-center">
              <p className="text-3xl mb-2">🤝</p>
              <p className="text-sm text-ink/60">No sponsor deals created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSponsors.map((s) => {
                const totalDeal = Number(s.promised_amount || s.amount || 0)
                const recAmt = Number(s.amount_received || 0)
                const pendAmt = Math.max(0, totalDeal - recAmt)
                const isExpanded = expandedSponsorId === s.id
                const simpleTier = s.tier ? s.tier.replace(' Sponsor', '') : 'Bronze'
                const badgeColor = TIER_COLORS[simpleTier] || TIER_COLORS.Bronze
                const badgeIcon = TIER_ICONS[simpleTier] || '🥉'

                return (
                  <div key={s.id} className="lift bg-card border border-rule rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-lg font-bold text-ink">{s.name}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {badgeIcon} {s.tier}
                          </span>
                        </div>
                        <p className="text-xs text-ink/55 mt-0.5">
                          {s.contact_name} {s.contact_name && s.contact_email ? '·' : ''} {s.contact_email}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Committed Deal</p>
                        <p className="figure text-xl font-bold text-ink">{formatMoney(totalDeal, currency)}</p>
                      </div>
                    </div>

                    {/* Received vs Pending Financial Badges */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-positive-500/10 border border-positive-500/25 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-positive-400 block">Received (In Income)</span>
                        <span className="font-bold text-positive-300 text-sm">{formatMoney(recAmt, currency)}</span>
                      </div>
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Pending Receivable</span>
                        <span className="font-bold text-amber-300 text-sm">{formatMoney(pendAmt, currency)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => setExpandedSponsorId(isExpanded ? null : s.id)}
                        className="text-xs font-semibold px-3 py-1.5 border border-rule rounded-lg bg-well/60 hover:bg-well text-ink transition-colors flex items-center gap-1"
                      >
                        {isExpanded ? 'Hide Staged Installments ▲' : '🤝 Staged Installments & Receivables ▼'}
                      </button>

                      {canManage && (
                        <button onClick={() => handleDeleteSponsor(s.id)} className="text-xs text-deficit-500 hover:text-deficit-600 font-semibold px-2 py-1">
                          Delete
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <SponsorInstallmentTracker sponsor={s} currency={currency} canManage={canManage} onUpdated={loadData} />
                    )}

                    <SponsorDeliverables sponsorId={s.id} canManage={canManage} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Sponsors() {
  return <RequireActiveEvent>{(eventId) => <SponsorsContent eventId={eventId} />}</RequireActiveEvent>
}
