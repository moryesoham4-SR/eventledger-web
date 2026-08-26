import { useState, useEffect } from 'react'
import * as sponsorsApi from '../api/sponsors'
import * as sponsorshipApi from '../api/sponsorship'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useMyRole } from '../hooks/useMyRole'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { getErrorMessage } from '../api/client'

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
      await sponsorshipApi.deleteDeliverable(id)
      load()
      toast.success('Deliverable removed')
    } catch {
      toast.error("Couldn't remove deliverable")
    }
  }

  const completedCount = deliverables.filter((d) => d.status === 'completed').length
  const pct = deliverables.length > 0 ? Math.round((completedCount / deliverables.length) * 100) : 0

  return (
    <div className="mt-3 pt-3 border-t border-rule/50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink/70">📋 Deliverables Checklist</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-well text-ink/60 border border-rule">
            {completedCount}/{deliverables.length} Done ({pct}%)
          </span>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            {showAdd ? 'Cancel' : '+ Add Item'}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {deliverables.length > 0 && (
        <div className="w-full bg-well rounded-full h-1.5 mb-2 overflow-hidden border border-rule/40">
          <div
            className="bg-emerald-500 h-1.5 transition-all duration-300 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-2">
          <input
            required
            placeholder="e.g. Logo on flex banner, 2 Stall Spaces, Social Media post"
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
  const { canApproveBudget: canManage } = useMyRole(eventId)
  const [sponsors, setSponsors] = useState([])
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    tier: 'Gold Sponsor',
    contact_name: '',
    contact_email: '',
    amount: '',
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
    if (!form.name || !form.amount) {
      toast.error('Please enter sponsor name and amount')
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
        amount: Number(form.amount) || 0,
        status: 'confirmed',
        notes: form.notes || '',
      })
      toast.success('Sponsor added successfully')
      setShowModal(false)
      setForm({ name: '', tier: 'Gold Sponsor', contact_name: '', contact_email: '', amount: '', notes: '' })
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't add sponsor"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSponsor = async (id) => {
    if (!(await confirm('Delete this sponsor entry?', { danger: true, confirmLabel: 'Delete' }))) return
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
      (s.contact_email && String(s.contact_email).toLowerCase().includes(q)) ||
      (s.amount !== undefined && String(s.amount).includes(q))
    )
  })

  const totalRaised = safeSponsors.reduce((sum, s) => sum + Number(s.amount || 0), 0)

  return (
    <div>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Sponsorship Tiers & Tracker</h2>
            <p className="text-xs text-ink/55 mt-0.5">
              Total Raised: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(totalRaised)}</span>
            </p>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search sponsors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-well border border-rule rounded-full px-3.5 py-1.5 pl-8 text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-primary-500 w-48 sm:w-64 transition-all"
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

        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all shadow-xs"
          >
            + Add Sponsor
          </button>
        )}
      </div>

      {/* Tier Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {tiers.map((t) => {
          const matching = safeSponsors.filter((s) => s.tier && s.tier.toLowerCase().includes(t.tier_name.toLowerCase().split(' ')[0]))
          const sum = matching.reduce((acc, s) => acc + Number(s.amount || 0), 0)
          const icon = TIER_ICONS[t.tier_name.split(' ')[0]] || '🏷️'

          return (
            <div key={t.id} className="bg-card border border-rule rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-ink text-sm flex items-center gap-1.5">
                    <span>{icon}</span> {t.tier_name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-well text-ink/70 border border-rule">
                    {matching.length} {matching.length === 1 ? 'Sponsor' : 'Sponsors'}
                  </span>
                </div>
                <p className="text-[11px] text-ink/50 mt-1 line-clamp-2">{t.description}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-rule/50 flex items-center justify-between">
                <span className="text-[10px] text-ink/50">Raised:</span>
                <span className="font-bold text-sm text-primary-600 dark:text-primary-400">{formatMoney(sum)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Sponsors List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-36 rounded-xl" />
          <div className="skeleton h-36 rounded-xl" />
        </div>
      ) : filteredSponsors.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🤝</p>
          <p className="text-sm text-ink/60">
            {searchQuery ? `No sponsors matching "${searchQuery}"` : 'No sponsors added yet.'}
          </p>
          <p className="text-xs text-ink/40 mt-1">Add sponsors and assign deliverables like banners, stalls, and social mentions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSponsors.map((sponsor) => {
            const rawTier = sponsor.tier || 'Bronze'
            const key = Object.keys(TIER_COLORS).find((k) => rawTier.toLowerCase().includes(k.toLowerCase())) || 'Bronze'
            const badgeStyle = TIER_COLORS[key] || TIER_COLORS.Bronze
            const icon = TIER_ICONS[key] || '🏷️'

            return (
              <div key={sponsor.id} className="bg-card border border-rule rounded-xl p-4 flex flex-col justify-between hover:border-primary-300 transition-all shadow-xs">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-display font-bold text-ink text-base">{sponsor.name}</h4>
                      {sponsor.contact_name && (
                        <p className="text-xs text-ink/55 mt-0.5">
                          👤 {sponsor.contact_name} {sponsor.contact_email ? `· ${sponsor.contact_email}` : ''}
                        </p>
                      )}
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${badgeStyle}`}>
                      {icon} {sponsor.tier}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between bg-well rounded-lg p-2.5 border border-rule/50">
                    <span className="text-xs text-ink/60 font-medium">Sponsorship Amount</span>
                    <span className="text-base font-bold font-display text-emerald-600 dark:text-emerald-400">
                      {formatMoney(sponsor.amount)}
                    </span>
                  </div>

                  {/* Deliverables Checklist Component */}
                  <SponsorDeliverables sponsorId={sponsor.id} canManage={canManage} />
                </div>

                {canManage && (
                  <div className="mt-3 pt-2 border-t border-rule/40 flex justify-end">
                    <button
                      onClick={() => handleDeleteSponsor(sponsor.id)}
                      className="text-xs text-deficit-500 hover:text-deficit-700"
                    >
                      Delete Sponsor
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal to Add Sponsor */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-rule rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
            <h3 className="font-display text-lg font-semibold text-ink mb-1">Add Event Sponsor</h3>
            <p className="text-xs text-ink/60 mb-4">Enter sponsor details and select their sponsorship tier.</p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1">Sponsor Name *</label>
                <input
                  required
                  placeholder="e.g. Red Bull India"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink/70 mb-1">Sponsorship Tier</label>
                  <select
                    value={form.tier}
                    onChange={(e) => setForm({ ...form, tier: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                  >
                    {tiers.length > 0 ? (
                      tiers.map((t) => (
                        <option key={t.id} value={t.tier_name}>
                          {t.tier_name} ({formatMoney(t.min_amount)}+)
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Title Sponsor">👑 Title Sponsor</option>
                        <option value="Gold Sponsor">🥇 Gold Sponsor</option>
                        <option value="Silver Sponsor">🥈 Silver Sponsor</option>
                        <option value="Bronze Sponsor">🥉 Bronze Sponsor</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/70 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1">Contact Person Name</label>
                <input
                  placeholder="e.g. Rohan Verma"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="rohan@redbull.com"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-ink/70 border border-rule rounded-lg hover:bg-well"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all"
                >
                  {submitting ? 'Adding...' : 'Add Sponsor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Sponsors() {
  return <RequireActiveEvent>{(eventId) => <SponsorsContent eventId={eventId} />}</RequireActiveEvent>
}
