import { useEffect, useState } from 'react'
import RequireActiveEvent from '../components/RequireActiveEvent'
import * as masterPlanningApi from '../api/master_planning'
import * as sandboxPlanningApi from '../api/sandbox_planning'
import * as departmentsApi from '../api/departments'
import * as budgetApi from '../api/budget'
import { useAuth } from '../context/AuthContext'
import { useMyRole } from '../hooks/useMyRole'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../api/client'
import { formatMoney } from '../components/StatCard'

function MasterPlanningContent({ eventId }) {
  const toast = useToast()
  const { user } = useAuth()
  const role = useMyRole(eventId)

  const [activeTab, setActiveTab] = useState('strategy') // 'strategy', 'budgets', 'risks', 'sandbox'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Master Data
  const [strategy, setStrategy] = useState({ master_vision: '', target_audience: '', key_objectives: '', notes: '' })
  const [milestones, setMilestones] = useState([])
  const [budgetPlans, setBudgetPlans] = useState({}) // { dept_id: { plan_a_amount, plan_b_amount, notes } }
  const [departments, setDepartments] = useState([])
  const [proposals, setProposals] = useState([])
  const [risks, setRisks] = useState([])

  // Sandbox Data
  const [scenarios, setScenarios] = useState([])
  const [activeScenarioId, setActiveScenarioId] = useState(null)

  // Modal / Form States
  const [newMilestone, setNewMilestone] = useState({ phase: 'Planning', title: '', target_date: '', assigned_co_head: '' })
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)

  const [newRisk, setNewRisk] = useState({ risk_title: '', severity: 'medium', mitigation_plan_b: '', backup_vendor: '', emergency_contact: '' })
  const [showRiskModal, setShowRiskModal] = useState(false)

  const [newScenario, setNewScenario] = useState({ title: '', description: '', projected_income: 0, notes: '' })
  const [showScenarioModal, setShowScenarioModal] = useState(false)

  const [newSandboxDept, setNewSandboxDept] = useState({ name: '', color: '#6366f1' })
  const [showSandboxDeptModal, setShowSandboxDeptModal] = useState(false)

  const [newSandboxItem, setNewSandboxItem] = useState({ sandbox_dept_id: null, item_name: '', amount: '', notes: '' })
  const [showSandboxItemModal, setShowSandboxItemModal] = useState(false)

  const [showMergeModal, setShowMergeModal] = useState(false)

  const loadData = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const [mpData, deptsList, propsList, sbData] = await Promise.all([
        masterPlanningApi.getMasterPlan(eventId).catch(() => null),
        departmentsApi.listDepartments(eventId).catch(() => []),
        budgetApi.listProposals(eventId).catch(() => []),
        sandboxPlanningApi.getSandboxData(eventId).catch(() => null),
      ])

      if (mpData) {
        setStrategy(mpData.strategy || { master_vision: '', target_audience: '', key_objectives: '', notes: '' })
        setMilestones(Array.isArray(mpData.milestones) ? mpData.milestones : [])
        setRisks(Array.isArray(mpData.risks) ? mpData.risks : [])

        const bpMap = {}
        if (Array.isArray(mpData.budget_plans)) {
          mpData.budget_plans.forEach((bp) => {
            bpMap[bp.department_id] = {
              plan_a_amount: Number(bp.plan_a_amount || 0),
              plan_b_amount: Number(bp.plan_b_amount || 0),
              notes: bp.notes || '',
            }
          })
        }
        setBudgetPlans(bpMap)
      }

      setDepartments(Array.isArray(deptsList) ? deptsList : [])
      setProposals(Array.isArray(propsList) ? propsList : [])

      if (sbData && Array.isArray(sbData.scenarios)) {
        setScenarios(sbData.scenarios)
        if (sbData.scenarios.length > 0 && !activeScenarioId) {
          setActiveScenarioId(sbData.scenarios[0].id)
        }
      }
    } catch (err) {
      toast.error('Failed to load master planning data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const canAccessMasterPlanning = Boolean(user?.is_super_admin) || role.level === 'co_leader' || role.level === 'event_admin'

  if (!canAccessMasterPlanning && !loading) {
    return (
      <div className="bg-card border border-rule rounded-2xl p-10 text-center max-w-xl mx-auto my-12 shadow-lg">
        <span className="text-4xl mb-3 block">🔒</span>
        <h3 className="font-display text-xl font-bold text-ink">SuperAdmin & Co-Heads Restricted Zone</h3>
        <p className="text-xs text-ink/60 mt-2">
          Master & Backup Planning mode is reserved exclusively for Super Admins, Event Leads, and Department Co-Heads for executive contingency modeling.
        </p>
      </div>
    )
  }

  // Active Sandbox Scenario
  const currentScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0]

  // Save Strategy
  const handleSaveStrategy = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await masterPlanningApi.updateStrategy({
        event_id: Number(eventId),
        ...strategy,
      })
      toast.success('Master Event Strategy saved! ⚡')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save strategy'))
    } finally {
      setSaving(false)
    }
  }

  // Save Plan A vs B
  const handleSaveBudgetPlans = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const items = departments.map((d) => {
        const bp = budgetPlans[d.id] || { plan_a_amount: 0, plan_b_amount: 0, notes: '' }
        return {
          department_id: Number(d.id),
          plan_a_amount: Number(bp.plan_a_amount || 0),
          plan_b_amount: Number(bp.plan_b_amount || 0),
          notes: bp.notes || '',
        }
      })
      await masterPlanningApi.saveBudgetPlans({ event_id: Number(eventId), items })
      toast.success('Plan A vs Plan B Master Budgets updated! 💰')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save budget plans'))
    } finally {
      setSaving(false)
    }
  }

  // Milestone Actions
  const handleCreateMilestone = async (e) => {
    e.preventDefault()
    if (!newMilestone.title) return
    try {
      await masterPlanningApi.createMilestone({
        event_id: Number(eventId),
        ...newMilestone,
      })
      toast.success('Milestone added!')
      setNewMilestone({ phase: 'Planning', title: '', target_date: '', assigned_co_head: '' })
      setShowMilestoneModal(false)
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create milestone'))
    }
  }

  const handleToggleMilestone = async (m) => {
    try {
      await masterPlanningApi.updateMilestone(m.id, { is_completed: !m.is_completed })
      toast.success(m.is_completed ? 'Milestone pending' : 'Milestone achieved! 🎉')
      loadData()
    } catch (err) {
      toast.error('Failed to update milestone status')
    }
  }

  const handleDeleteMilestone = async (id) => {
    try {
      await masterPlanningApi.deleteMilestone(id)
      toast.success('Milestone removed')
      loadData()
    } catch (err) {
      toast.error('Failed to delete milestone')
    }
  }

  // Risk Actions
  const handleCreateRisk = async (e) => {
    e.preventDefault()
    if (!newRisk.risk_title) return
    try {
      await masterPlanningApi.createRisk({
        event_id: Number(eventId),
        ...newRisk,
      })
      toast.success('Risk item logged!')
      setNewRisk({ risk_title: '', severity: 'medium', mitigation_plan_b: '', backup_vendor: '', emergency_contact: '' })
      setShowRiskModal(false)
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to log risk'))
    }
  }

  const handleDeleteRisk = async (id) => {
    try {
      await masterPlanningApi.deleteRisk(id)
      toast.success('Risk item deleted')
      loadData()
    } catch (err) {
      toast.error('Failed to delete risk item')
    }
  }

  // Sandbox Scenario Actions
  const handleCreateScenario = async (e) => {
    e.preventDefault()
    if (!newScenario.title) return
    try {
      const res = await sandboxPlanningApi.createScenario({
        event_id: Number(eventId),
        ...newScenario,
        projected_income: Number(newScenario.projected_income || 0),
      })
      toast.success('New Draft Planning Scenario created! 🧪')
      setNewScenario({ title: '', description: '', projected_income: 0, notes: '' })
      setShowScenarioModal(false)
      if (res && res.id) setActiveScenarioId(res.id)
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create draft scenario'))
    }
  }

  const handleDeleteScenario = async (scId) => {
    try {
      await sandboxPlanningApi.deleteScenario(scId)
      toast.success('Draft Scenario deleted')
      setActiveScenarioId(null)
      loadData()
    } catch (err) {
      toast.error('Failed to delete scenario')
    }
  }

  const handleCreateSandboxDept = async (e) => {
    e.preventDefault()
    if (!newSandboxDept.name || !currentScenario) return
    try {
      await sandboxPlanningApi.createSandboxDepartment({
        scenario_id: currentScenario.id,
        ...newSandboxDept,
      })
      toast.success(`Draft Department "${newSandboxDept.name}" added to Sandbox!`)
      setNewSandboxDept({ name: '', color: '#6366f1' })
      setShowSandboxDeptModal(false)
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create sandbox department'))
    }
  }

  const handleDeleteSandboxDept = async (deptId) => {
    try {
      await sandboxPlanningApi.deleteSandboxDepartment(deptId)
      toast.success('Sandbox department deleted')
      loadData()
    } catch (err) {
      toast.error('Failed to delete sandbox department')
    }
  }

  const handleCreateSandboxItem = async (e) => {
    e.preventDefault()
    if (!newSandboxItem.item_name || !newSandboxItem.sandbox_dept_id) return
    try {
      await sandboxPlanningApi.createSandboxItem({
        ...newSandboxItem,
        amount: Number(newSandboxItem.amount || 0),
      })
      toast.success('Draft budget item added!')
      setNewSandboxItem({ sandbox_dept_id: null, item_name: '', amount: '', notes: '' })
      setShowSandboxItemModal(false)
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add sandbox item'))
    }
  }

  const handleDeleteSandboxItem = async (itemId) => {
    try {
      await sandboxPlanningApi.deleteSandboxItem(itemId)
      toast.success('Draft item removed')
      loadData()
    } catch (err) {
      toast.error('Failed to delete draft item')
    }
  }

  const handleMergeToMain = async () => {
    if (!currentScenario) return
    setSaving(true)
    try {
      const res = await sandboxPlanningApi.mergeToMainEvent({
        event_id: Number(eventId),
        scenario_id: currentScenario.id,
      })
      toast.success(res.message || 'Sandbox Scenario promoted to main event! 🚀')
      setShowMergeModal(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to merge scenario'))
    } finally {
      setSaving(false)
    }
  }

  // Plan A vs Plan B Totals
  const totalPlanA = departments.reduce((sum, d) => sum + Number(budgetPlans[d.id]?.plan_a_amount || 0), 0)
  const totalPlanB = departments.reduce((sum, d) => sum + Number(budgetPlans[d.id]?.plan_b_amount || 0), 0)
  const totalProposed = proposals.reduce((sum, p) => sum + Number(p.total_amount || 0), 0)

  // Sandbox Scenario Totals
  const currentSandboxTotal = currentScenario
    ? (currentScenario.departments || []).reduce(
        (deptSum, d) => deptSum + (d.items || []).reduce((itemSum, i) => itemSum + Number(i.amount || 0), 0),
        0
      )
    : 0

  const projectedIncome = currentScenario ? Number(currentScenario.projected_income || 0) : 0
  const sandboxNetMargin = projectedIncome - currentSandboxTotal

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-3xl font-bold text-ink">⭐ Master & Backup Planning Suite</h2>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              SuperAdmin & Co-Heads Only
            </span>
          </div>
          <p className="text-xs text-ink/60 mt-1">
            Executive War Room — Strategy, Plan A vs Plan B Contingency Budgets, Risk Register, & Mini EventLedger Sandbox.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-rule space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('strategy')}
          className={`px-4 py-2.5 text-xs font-bold font-display border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'strategy'
              ? 'border-primary-500 text-primary-400 bg-primary-500/10 rounded-t-xl'
              : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          <span>📋</span> Master Strategy & Milestones
        </button>

        <button
          onClick={() => setActiveTab('budgets')}
          className={`px-4 py-2.5 text-xs font-bold font-display border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'budgets'
              ? 'border-primary-500 text-primary-400 bg-primary-500/10 rounded-t-xl'
              : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          <span>💰</span> Dual Budgeting (Plan A vs Plan B)
        </button>

        <button
          onClick={() => setActiveTab('risks')}
          className={`px-4 py-2.5 text-xs font-bold font-display border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'risks'
              ? 'border-primary-500 text-primary-400 bg-primary-500/10 rounded-t-xl'
              : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          <span>🛡️</span> Risk & Backup Contingency Plan
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={`px-4 py-2.5 text-xs font-bold font-display border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'sandbox'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-xl'
              : 'border-transparent text-purple-400/60 hover:text-purple-300'
          }`}
        >
          <span>🧪</span> Mini EventLedger (Sandbox & Drafts)
        </button>
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : activeTab === 'strategy' ? (
        /* TAB 1: MASTER STRATEGY & MILESTONES */
        <div className="space-y-6">
          <form onSubmit={handleSaveStrategy} className="bg-card border border-rule rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              🎯 Master Event Vision & Executive Strategy
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-ink/70 block mb-1">Master Vision Statement</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Host the region's largest flagship AI & Tech summit with 1500+ attendees..."
                  value={strategy.master_vision}
                  onChange={(e) => setStrategy({ ...strategy, master_vision: e.target.value })}
                  className="w-full bg-well border border-rule rounded-xl p-3 text-xs text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink/70 block mb-1">Target Audience & Demographics</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Engineering students, tech founders, VC investors, corporate sponsors..."
                  value={strategy.target_audience}
                  onChange={(e) => setStrategy({ ...strategy, target_audience: e.target.value })}
                  className="w-full bg-well border border-rule rounded-xl p-3 text-xs text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-ink/70 block mb-1">Key Performance Objectives (KPIs)</label>
                <textarea
                  rows={3}
                  placeholder="1. Net positive profit > ₹50,000&#10;2. 95% attendee satisfaction score&#10;3. Zero safety incidents"
                  value={strategy.key_objectives}
                  onChange={(e) => setStrategy({ ...strategy, key_objectives: e.target.value })}
                  className="w-full bg-well border border-rule rounded-xl p-3 text-xs text-ink focus:outline-hidden focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink/70 block mb-1">Executive Notes for Co-Heads</label>
                <textarea
                  rows={3}
                  placeholder="Internal guidelines, confidential instructions, or backup venue agreements..."
                  value={strategy.notes}
                  onChange={(e) => setStrategy({ ...strategy, notes: e.target.value })}
                  className="w-full bg-well border border-rule rounded-xl p-3 text-xs text-ink focus:outline-hidden focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Executive Strategy ⚡'}
              </button>
            </div>
          </form>

          {/* Milestones Section */}
          <div className="bg-card border border-rule rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">🚩 Master Milestone Timeline Checklist</h3>
                <p className="text-xs text-ink/60">Phase-by-phase execution deadlines for Co-Heads.</p>
              </div>
              <button
                onClick={() => setShowMilestoneModal(true)}
                className="bg-primary-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-primary-700 transition-all shadow-xs"
              >
                + Add Milestone
              </button>
            </div>

            {milestones.length === 0 ? (
              <div className="p-8 border border-dashed border-rule rounded-xl text-center text-xs text-ink/50">
                No milestones added yet. Add critical deadlines for your Co-Heads!
              </div>
            ) : (
              <div className="space-y-2.5">
                {milestones.map((m) => (
                  <div key={m.id} className="p-3.5 bg-well/50 border border-rule rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={m.is_completed}
                        onChange={() => handleToggleMilestone(m)}
                        className="w-4 h-4 rounded text-primary-600 accent-primary-600 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${m.is_completed ? 'line-through text-ink/40' : 'text-ink'}`}>
                            {m.title}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 font-semibold text-[10px]">
                            {m.phase}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink/50 mt-0.5">
                          Assigned Co-Head: <strong className="text-ink/70">{m.assigned_co_head || 'Unassigned'}</strong>
                          {m.target_date && ` · Target: ${m.target_date}`}
                        </p>
                      </div>
                    </div>

                    <button onClick={() => handleDeleteMilestone(m.id)} className="text-deficit-500 hover:text-deficit-600 font-bold px-2">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'budgets' ? (
        /* TAB 2: DUAL BUDGETING (PLAN A vs PLAN B) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-2xl text-primary-300">
              <p className="text-xs font-semibold uppercase tracking-wider">Plan A (Master Target Budget)</p>
              <p className="text-2xl font-bold mt-1 figure">{formatMoney(totalPlanA)}</p>
              <p className="text-[11px] text-primary-400/70 mt-1">Full vision scenario budget</p>
            </div>

            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-300">
              <p className="text-xs font-semibold uppercase tracking-wider">Plan B (Contingency Backup Budget)</p>
              <p className="text-2xl font-bold mt-1 figure">{formatMoney(totalPlanB)}</p>
              <p className="text-[11px] text-purple-400/70 mt-1">Lean backup model (revenue drop)</p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300">
              <p className="text-xs font-semibold uppercase tracking-wider">Live Proposed Sum</p>
              <p className="text-2xl font-bold mt-1 figure">{formatMoney(totalProposed)}</p>
              <p className="text-[11px] text-amber-400/70 mt-1">Submitted by department heads</p>
            </div>
          </div>

          <form onSubmit={handleSaveBudgetPlans} className="bg-card border border-rule rounded-2xl p-6 space-y-5 shadow-sm">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">💰 Master Department Allocation Matrix (Plan A vs Plan B)</h3>
              <p className="text-xs text-ink/60 mt-0.5">
                Set primary targets (Plan A) and lean emergency limits (Plan B) per department.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-rule text-ink/50 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Plan A Target (₹)</th>
                    <th className="py-2.5 px-3">Plan B Lean Contingency (₹)</th>
                    <th className="py-2.5 px-3">Strategy Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {departments.map((d) => {
                    const bp = budgetPlans[d.id] || { plan_a_amount: 0, plan_b_amount: 0, notes: '' }
                    return (
                      <tr key={d.id} className="hover:bg-well/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color || '#6366f1' }} />
                            <span className="font-bold text-ink text-sm">{d.name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={bp.plan_a_amount}
                            onChange={(e) =>
                              setBudgetPlans({
                                ...budgetPlans,
                                [d.id]: { ...bp, plan_a_amount: e.target.value },
                              })
                            }
                            className="w-32 bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink font-bold text-primary-400"
                          />
                        </td>

                        <td className="py-3 px-3">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={bp.plan_b_amount}
                            onChange={(e) =>
                              setBudgetPlans({
                                ...budgetPlans,
                                [d.id]: { ...bp, plan_b_amount: e.target.value },
                              })
                            }
                            className="w-32 bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink font-bold text-purple-300"
                          />
                        </td>

                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="e.g. Cut DJ and use college sound system in Plan B"
                            value={bp.notes}
                            onChange={(e) =>
                              setBudgetPlans({
                                ...budgetPlans,
                                [d.id]: { ...bp, notes: e.target.value },
                              })
                            }
                            className="w-full bg-well border border-rule rounded-lg px-2.5 py-1.5 text-xs text-ink"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-rule">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Plan A & B Budget Matrix ⚡'}
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'risks' ? (
        /* TAB 3: RISK & EMERGENCY CONTINGENCY PLAN */
        <div className="space-y-6">
          <div className="bg-card border border-rule rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">🛡️ Risk Register & Standby Contingency Plans</h3>
                <p className="text-xs text-ink/60">Pre-planned Plan B solutions for weather, vendor cancellations, and emergency risks.</p>
              </div>
              <button
                onClick={() => setShowRiskModal(true)}
                className="bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-primary-700 transition-all shadow-xs"
              >
                + Log New Risk
              </button>
            </div>

            {risks.length === 0 ? (
              <div className="p-8 border border-dashed border-rule rounded-xl text-center text-xs text-ink/50">
                No contingency risks logged. Click "+ Log New Risk" to define backup vendor plans!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {risks.map((r) => (
                  <div key={r.id} className="p-4 bg-well/50 border border-rule rounded-xl space-y-2 relative">
                    <button
                      onClick={() => handleDeleteRisk(r.id)}
                      className="absolute top-3 right-3 text-deficit-500 hover:text-deficit-600 text-xs font-bold"
                    >
                      ✕
                    </button>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          r.severity === 'critical'
                            ? 'bg-deficit-500/20 text-deficit-400 border border-deficit-500/30'
                            : r.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-primary-500/20 text-primary-400'
                        }`}
                      >
                        {r.severity} Risk
                      </span>
                      <h4 className="font-bold text-sm text-ink">{r.risk_title}</h4>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="text-ink/80">
                        <strong className="text-purple-300">Plan B Mitigation:</strong> {r.mitigation_plan_b || 'None specified'}
                      </p>
                      {r.backup_vendor && (
                        <p className="text-ink/70">
                          <strong>Standby Vendor:</strong> {r.backup_vendor}
                        </p>
                      )}
                      {r.emergency_contact && (
                        <p className="text-ink/70">
                          <strong>Emergency Contact:</strong> {r.emergency_contact}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 4: MINI EVENTLEDGER (SANDBOX & DRAFT SCENARIOS) */
        <div className="space-y-6">
          {/* Sandbox Top Control Bar */}
          <div className="bg-card border border-purple-500/30 rounded-2xl p-5 space-y-4 shadow-md bg-purple-950/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧪</span>
                  <h3 className="font-display text-lg font-bold text-purple-300">Mini EventLedger Sandbox</h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                    100% Isolated Draft Mode
                  </span>
                </div>
                <p className="text-xs text-ink/60 mt-0.5">
                  Test & draft custom departments and line items without merging or affecting the main event database.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowScenarioModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs"
                >
                  + New Draft Scenario
                </button>

                {currentScenario && (
                  <button
                    onClick={() => setShowMergeModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <span>🚀</span> Merge Scenario to Main Event
                  </button>
                )}
              </div>
            </div>

            {/* Scenario Selector */}
            {scenarios.length > 0 && (
              <div className="flex items-center gap-2 border-t border-purple-500/20 pt-3 overflow-x-auto">
                <span className="text-xs font-bold text-purple-400 shrink-0">Select Draft Model:</span>
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => setActiveScenarioId(sc.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                      sc.id === activeScenarioId
                        ? 'bg-purple-500 text-white shadow-xs'
                        : 'bg-well/60 text-ink/70 hover:bg-well hover:text-ink'
                    }`}
                  >
                    <span>{sc.title}</span>
                    {sc.id === activeScenarioId && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteScenario(sc.id)
                        }}
                        className="text-purple-200 hover:text-white font-bold ml-1"
                        title="Delete scenario"
                      >
                        ✕
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sandbox Financial Health Bar */}
          {currentScenario ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-300">
                  <p className="text-xs font-semibold uppercase tracking-wider">Draft Sandbox Budget Total</p>
                  <p className="text-2xl font-bold mt-1 figure">{formatMoney(currentSandboxTotal)}</p>
                  <p className="text-[11px] text-purple-400/70 mt-1">Sum of all draft line items</p>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300">
                  <p className="text-xs font-semibold uppercase tracking-wider">Projected Sandbox Revenue</p>
                  <p className="text-2xl font-bold mt-1 figure">{formatMoney(projectedIncome)}</p>
                  <p className="text-[11px] text-emerald-400/70 mt-1">Sponsorships & Ticket projections</p>
                </div>

                <div
                  className={`p-4 border rounded-2xl ${
                    sandboxNetMargin >= 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-deficit-500/10 border-deficit-500/30 text-deficit-400'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider">Expected Net Surplus / Deficit</p>
                  <p className="text-2xl font-bold mt-1 figure">{formatMoney(sandboxNetMargin)}</p>
                  <p className="text-[11px] opacity-70 mt-1">Projected revenue minus draft budget</p>
                </div>
              </div>

              {/* Draft Department Cards */}
              <div className="bg-card border border-rule rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">
                      📦 Draft Departments in "{currentScenario.title}"
                    </h3>
                    <p className="text-xs text-ink/60">
                      Add isolated departments and test draft cost items without touching main event data.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSandboxDeptModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-xs"
                  >
                    + Add Draft Department
                  </button>
                </div>

                {(!currentScenario.departments || currentScenario.departments.length === 0) ? (
                  <div className="p-8 border border-dashed border-rule rounded-xl text-center text-xs text-ink/50">
                    No sandbox departments added. Click "+ Add Draft Department" to start modeling!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentScenario.departments.map((sd) => {
                      const deptTotal = (sd.items || []).reduce((sum, i) => sum + Number(i.amount || 0), 0)
                      return (
                        <div key={sd.id} className="p-4 bg-well/50 border border-rule rounded-2xl space-y-3 relative">
                          <button
                            onClick={() => handleDeleteSandboxDept(sd.id)}
                            className="absolute top-3 right-3 text-deficit-500 hover:text-deficit-600 text-xs font-bold"
                            title="Delete sandbox department"
                          >
                            ✕
                          </button>

                          <div className="flex items-center justify-between pr-6">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: sd.color || '#6366f1' }} />
                              <h4 className="font-bold text-ink text-base">{sd.name}</h4>
                            </div>
                            <span className="text-xs font-bold text-purple-300 figure">{formatMoney(deptTotal)}</span>
                          </div>

                          {/* Line Items List */}
                          <div className="space-y-1.5 pt-1">
                            {(!sd.items || sd.items.length === 0) ? (
                              <p className="text-[11px] text-ink/40 italic">No draft items added yet.</p>
                            ) : (
                              sd.items.map((it) => (
                                <div key={it.id} className="flex items-center justify-between bg-card p-2 rounded-lg text-xs border border-rule/60">
                                  <div>
                                    <p className="font-semibold text-ink">{it.item_name}</p>
                                    {it.notes && <p className="text-[10px] text-ink/50">{it.notes}</p>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-ink figure">{formatMoney(it.amount)}</span>
                                    <button onClick={() => handleDeleteSandboxItem(it.id)} className="text-deficit-500 hover:text-deficit-600 font-bold text-xs">
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add Item Button */}
                          <button
                            onClick={() => {
                              setNewSandboxItem({ sandbox_dept_id: sd.id, item_name: '', amount: '', notes: '' })
                              setShowSandboxItemModal(true)
                            }}
                            className="w-full text-center text-xs text-purple-300 font-semibold py-1.5 border border-dashed border-purple-500/30 hover:border-purple-500/60 rounded-lg transition-all"
                          >
                            + Add Draft Budget Item
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 border border-dashed border-rule rounded-2xl text-center space-y-3">
              <span className="text-4xl block">🧪</span>
              <h3 className="font-display text-lg font-bold text-ink">No Draft Scenarios Found</h3>
              <p className="text-xs text-ink/60 max-w-md mx-auto">
                Create your first sandbox scenario to model departments, budgets, and revenue in total isolation!
              </p>
              <button
                onClick={() => setShowScenarioModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs"
              >
                + Create First Draft Scenario
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-ink">➕ Add Master Milestone</h3>
              <button onClick={() => setShowMilestoneModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Phase</label>
                <select
                  value={newMilestone.phase}
                  onChange={(e) => setNewMilestone({ ...newMilestone, phase: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink font-semibold"
                >
                  <option value="Concept">Phase 1: Concept & Approvals</option>
                  <option value="Planning">Phase 2: Master Planning</option>
                  <option value="Procurement">Phase 3: Vendor Procurement</option>
                  <option value="Marketing">Phase 4: Marketing & Sponsorship</option>
                  <option value="Execution">Phase 5: Final Execution</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Milestone Title *</label>
                <input
                  required
                  placeholder="e.g. Sign Auditorium Rental Agreement"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newMilestone.target_date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Assigned Co-Head</label>
                  <input
                    placeholder="e.g. Rahul Sharma"
                    value={newMilestone.assigned_co_head}
                    onChange={(e) => setNewMilestone({ ...newMilestone, assigned_co_head: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-rule">
                <button type="button" onClick={() => setShowMilestoneModal(false)} className="px-4 py-2 text-xs text-ink/60 hover:text-ink">
                  Cancel
                </button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs">
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Risk Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-ink">🛡️ Log Risk & Backup Mitigation</h3>
              <button onClick={() => setShowRiskModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateRisk} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Risk Title / Potential Hazard *</label>
                <input
                  required
                  placeholder="e.g. Rain / Open Air Stage Weather Risk"
                  value={newRisk.risk_title}
                  onChange={(e) => setNewRisk({ ...newRisk, risk_title: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Risk Severity</label>
                <select
                  value={newRisk.severity}
                  onChange={(e) => setNewRisk({ ...newRisk, severity: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink font-semibold"
                >
                  <option value="low">🟢 Low Impact</option>
                  <option value="medium">🟡 Medium Impact</option>
                  <option value="high">🟠 High Impact</option>
                  <option value="critical">🔴 Critical / Showstopper</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Plan B Mitigation Strategy</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Shift main stage to indoor Auditorium B if rain forecast > 60%"
                  value={newRisk.mitigation_plan_b}
                  onChange={(e) => setNewRisk({ ...newRisk, mitigation_plan_b: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Standby Vendor</label>
                  <input
                    placeholder="e.g. Apex Tent House"
                    value={newRisk.backup_vendor}
                    onChange={(e) => setNewRisk({ ...newRisk, backup_vendor: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink/70 block mb-1">Emergency Contact</label>
                  <input
                    placeholder="e.g. +91 98765 43210"
                    value={newRisk.emergency_contact}
                    onChange={(e) => setNewRisk({ ...newRisk, emergency_contact: e.target.value })}
                    className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-rule">
                <button type="button" onClick={() => setShowRiskModal(false)} className="px-4 py-2 text-xs text-ink/60 hover:text-ink">
                  Cancel
                </button>
                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs">
                  Save Risk Protocol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sandbox Scenario Modal */}
      {showScenarioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-purple-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-purple-300">🧪 Create Draft Sandbox Scenario</h3>
              <button onClick={() => setShowScenarioModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateScenario} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Scenario Title *</label>
                <input
                  required
                  placeholder="e.g. Plan A: Mega Outdoor Fest"
                  value={newScenario.title}
                  onChange={(e) => setNewScenario({ ...newScenario, title: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Projected Revenue (Sponsorships / Tickets)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newScenario.projected_income}
                  onChange={(e) => setNewScenario({ ...newScenario, projected_income: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink font-bold text-emerald-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Scenario modeling full celebrity lineup with high sponsor engagement..."
                  value={newScenario.description}
                  onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-rule">
                <button type="button" onClick={() => setShowScenarioModal(false)} className="px-4 py-2 text-xs text-ink/60 hover:text-ink">
                  Cancel
                </button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-xs">
                  Create Sandbox Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sandbox Department Modal */}
      {showSandboxDeptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-ink">📦 Add Draft Sandbox Department</h3>
              <button onClick={() => setShowSandboxDeptModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateSandboxDept} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Draft Department Name *</label>
                <input
                  required
                  placeholder="e.g. VIP Lounge & Hospitality"
                  value={newSandboxDept.name}
                  onChange={(e) => setNewSandboxDept({ ...newSandboxDept, name: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Department Tag Color</label>
                <input
                  type="color"
                  value={newSandboxDept.color}
                  onChange={(e) => setNewSandboxDept({ ...newSandboxDept, color: e.target.value })}
                  className="w-full h-10 bg-well border border-rule rounded-lg p-1 cursor-pointer"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-rule">
                <button type="button" onClick={() => setShowSandboxDeptModal(false)} className="px-4 py-2 text-xs text-ink/60 hover:text-ink">
                  Cancel
                </button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs">
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sandbox Item Modal */}
      {showSandboxItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-rule rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-ink">➕ Add Draft Budget Line Item</h3>
              <button onClick={() => setShowSandboxItemModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateSandboxItem} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Item Title *</label>
                <input
                  required
                  placeholder="e.g. LED Wall Stage Rental"
                  value={newSandboxItem.item_name}
                  onChange={(e) => setNewSandboxItem({ ...newSandboxItem, item_name: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Estimated Cost (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={newSandboxItem.amount}
                  onChange={(e) => setNewSandboxItem({ ...newSandboxItem, amount: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink/70 block mb-1">Notes / Vendor Quote</label>
                <input
                  placeholder="e.g. Quoted by Soundcraft India"
                  value={newSandboxItem.notes}
                  onChange={(e) => setNewSandboxItem({ ...newSandboxItem, notes: e.target.value })}
                  className="w-full bg-well border border-rule rounded-lg px-3 py-2 text-xs text-ink"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-rule">
                <button type="button" onClick={() => setShowSandboxItemModal(false)} className="px-4 py-2 text-xs text-ink/60 hover:text-ink">
                  Cancel
                </button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs">
                  Save Line Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Confirmation Modal */}
      {showMergeModal && currentScenario && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-lg font-bold text-emerald-300 flex items-center gap-2">
                <span>🚀</span> Promote Scenario to Main Event
              </h3>
              <button onClick={() => setShowMergeModal(false)} className="text-ink/40 hover:text-ink text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs text-ink/80">
              <p>
                You are about to promote the sandbox scenario <strong>"{currentScenario.title}"</strong> into your live main event.
              </p>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1 text-emerald-200">
                <p><strong>Action Summary:</strong></p>
                <p>• {currentScenario.departments?.length || 0} Sandbox departments will be added to live Event Departments.</p>
                <p>• All draft budget items will be promoted into approved live Budget Proposals ({formatMoney(currentSandboxTotal)} total).</p>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-rule">
              <button type="button" onClick={() => setShowMergeModal(false)} className="px-4 py-2 text-xs text-ink/60 hover:text-ink">
                Cancel
              </button>
              <button
                onClick={handleMergeToMain}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-xs disabled:opacity-50"
              >
                {saving ? 'Promoting...' : 'Promote & Merge Now 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MasterPlanning() {
  return <RequireActiveEvent>{(eventId) => <MasterPlanningContent eventId={eventId} />}</RequireActiveEvent>
}
