import { useEffect, useState } from 'react'
import RequireActiveEvent from '../components/RequireActiveEvent'
import * as leaderboardApi from '../api/leaderboard'
import * as usersApi from '../api/users'
import CertificateModal from '../components/CertificateModal'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useMyRole } from '../hooks/useMyRole'

function LeaderboardContent({ eventId }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const role = useMyRole(eventId)

  const [leaderboardData, setLeaderboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [togglingCert, setTogglingCert] = useState(false)
  const [certModalData, setCertModalData] = useState(null)

  const loadLeaderboard = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const data = await leaderboardApi.getEventLeaderboard(eventId)
      setLeaderboardData(data)
    } catch {
      toast.error('Failed to load leaderboard scores.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [eventId])

  const handleToggleCertificates = async () => {
    const currentState = leaderboardData?.certificates_enabled
    const nextState = !currentState
    const actionWord = nextState ? 'UNLOCK and ALLOW' : 'LOCK and DISABLE'
    
    if (!(await confirm(`Are you sure you want to ${actionWord} Certificate Downloads for all team members?`, {
      title: `${nextState ? 'Unlock' : 'Lock'} Master Certificate Downloads`,
      confirmLabel: nextState ? 'Unlock Certificates' : 'Lock Certificates',
      danger: !nextState,
    }))) return

    setTogglingCert(true)
    try {
      await leaderboardApi.toggleCertificateIssuance(eventId, nextState)
      toast.success(nextState ? '🔓 Master Certificate Downloads UNLOCKED! Email notifications dispatched.' : '🔒 Certificate downloads locked.')
      loadLeaderboard()
    } catch {
      toast.error('Failed to update certificate issuance state.')
    } finally {
      setTogglingCert(false)
    }
  }

  const handleOpenCertificate = (volunteerUser) => {
    if (!leaderboardData?.certificates_enabled && !role.canToggleCertificates) {
      toast.error('🔒 Certificate downloads are currently locked by the Event Lead.')
      return
    }
    const recipientName = volunteerUser.name || volunteerUser.email || 'Team Member'
    const roleTitle = volunteerUser.role ? volunteerUser.role.replace('_', ' ').toUpperCase() : 'Co-Worker'
    const deptTitle = volunteerUser.dept_name || 'Event Operations'

    setCertModalData({
      organization_name: 'Event Management Board',
      event_title: 'Event Fest 2026',
      award_title: 'Certificate of Appreciation',
      recipient_name: recipientName,
      recipient_role: roleTitle,
      department_name: deptTitle,
      citation: 'In recognition of outstanding dedication, leadership, and exemplary event management service.',
      signatory_1: { title: 'Event Lead', name: 'Event Director' },
      signatory_2: { title: 'Faculty Advisor', name: 'Dean of Student Affairs' },
      certificate_id: `CERT-${eventId}-${volunteerUser.id || 99}-882`,
    })
  }

  const safeDepts = Array.isArray(leaderboardData?.departments) ? leaderboardData.departments : []
  const safeVolunteers = Array.isArray(leaderboardData?.volunteers) ? leaderboardData.volunteers : []
  const topThree = safeDepts.slice(0, 3)

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
            <span>🏆</span> Department Leaderboard & Audit
          </h2>
          <p className="text-sm text-ink/60 mt-1">
            Real-time department efficiency rankings, demerit points penalties, and digital certificate generator.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : (
        <div className="space-y-8">
          {/* Master Certificate Toggle Control Banner for Event Lead / Super Admin */}
          {role.canToggleCertificates && (
            <div className="bg-card border border-rule rounded-2xl p-5 shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                  leaderboardData?.certificates_enabled ? 'bg-positive-500/20 text-positive-400 border border-positive-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {leaderboardData?.certificates_enabled ? '🔓' : '🔒'}
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                    Master Certificate Download Switch: 
                    <span className={leaderboardData?.certificates_enabled ? 'text-positive-400 font-extrabold' : 'text-amber-400 font-extrabold'}>
                      {leaderboardData?.certificates_enabled ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </h4>
                  <p className="text-xs text-ink/55 mt-0.5">
                    {leaderboardData?.certificates_enabled
                      ? 'Team members can preview & download their official digital certificates.'
                      : 'Team members are restricted from downloading certificates until you unlock this toggle.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleCertificates}
                disabled={togglingCert}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-2 ${
                  leaderboardData?.certificates_enabled
                    ? 'bg-deficit-600 hover:bg-deficit-700 text-white'
                    : 'bg-positive-600 hover:bg-positive-700 text-white'
                }`}
              >
                {togglingCert ? 'Updating…' : leaderboardData?.certificates_enabled ? '🔒 Lock Downloads' : '🔓 Unlock Certificates'}
              </button>
            </div>
          )}

          {/* Department Leaderboard & Podium Section */}
          {safeDepts.length === 0 ? (
            <div className="bg-card border border-dashed border-rule rounded-2xl p-8 text-center space-y-2">
              <p className="text-3xl">🏢</p>
              <h4 className="font-bold text-ink text-sm">No Explicit Departments Created Yet</h4>
              <p className="text-xs text-ink/50 max-w-md mx-auto">
                Create departments under <strong>Departments & Work</strong> to see live efficiency scores and Gold/Silver/Bronze rankings!
              </p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
                {/* 2nd Place (Silver) */}
                {topThree[1] && (
                  <div className="lift bg-card border border-rule rounded-2xl p-5 text-center space-y-3 shadow-xs order-2 md:order-1">
                    <span className="w-10 h-10 rounded-full bg-slate-500/20 text-slate-300 font-bold flex items-center justify-center text-lg mx-auto border border-slate-500/30">
                      🥈
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink">{topThree[1].dept_name}</h3>
                      <p className="text-xs text-ink/55">Head: {topThree[1].head_name}</p>
                    </div>
                    <div className="p-2.5 bg-well/50 rounded-xl border border-rule">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Efficiency Score</p>
                      <p className="figure text-xl font-bold text-slate-300">{topThree[1].xp_score} XP</p>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold Podium - Elevated) */}
                {topThree[0] && (
                  <div className="lift bg-card border-2 border-amber-500/50 rounded-2xl p-6 text-center space-y-4 shadow-xl order-1 md:order-2 relative bg-gradient-to-b from-amber-500/10 to-transparent">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md">
                      ★ Top Department ★
                    </div>
                    <span className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-2xl mx-auto border border-amber-500/40 shadow-inner">
                      🥇
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-extrabold text-ink">{topThree[0].dept_name}</h3>
                      <p className="text-xs text-ink/60 font-medium">Head: {topThree[0].head_name}</p>
                    </div>
                    <div className="p-3 bg-amber-500/15 rounded-xl border border-amber-500/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Champion Efficiency Score</p>
                      <p className="figure text-2xl font-extrabold text-amber-400">{topThree[0].xp_score} XP</p>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {topThree[2] && (
                  <div className="lift bg-card border border-rule rounded-2xl p-5 text-center space-y-3 shadow-xs order-3">
                    <span className="w-10 h-10 rounded-full bg-amber-700/20 text-amber-500 font-bold flex items-center justify-center text-lg mx-auto border border-amber-700/30">
                      🥉
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink">{topThree[2].dept_name}</h3>
                      <p className="text-xs text-ink/55">Head: {topThree[2].head_name}</p>
                    </div>
                    <div className="p-2.5 bg-well/50 rounded-xl border border-rule">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Efficiency Score</p>
                      <p className="figure text-xl font-bold text-amber-500">{topThree[2].xp_score} XP</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Full Department Leaderboard Table */}
              <div className="space-y-3">
                <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                  <span>📊</span> Department Performance Breakdowns
                </h3>
                <div className="bg-card border border-rule rounded-2xl overflow-hidden shadow-xs divide-y divide-rule text-xs">
                  {safeDepts.map((d) => (
                    <div key={d.dept_id} className="p-4 flex items-center justify-between gap-4 flex-wrap hover:bg-well/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base w-8 text-center">{d.badge}</span>
                        <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                        <div>
                          <h4 className="font-bold text-ink text-sm">{d.dept_name}</h4>
                          <p className="text-ink/50 text-[11px]">Head: {d.head_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-right flex-wrap">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-ink/40">Task Completion</p>
                          <p className="font-semibold text-ink">{d.completed_tasks}/{d.total_tasks} ({d.task_completion_pct}%)</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-ink/40">Budget Efficiency</p>
                          <p className="font-semibold text-ink">{d.budget_efficiency}%</p>
                        </div>
                        {d.demerit_points > 0 && (
                          <div className="bg-deficit-500/10 border border-deficit-500/30 text-deficit-400 px-2.5 py-1 rounded-lg">
                            <p className="text-[10px] font-bold uppercase">Demerits</p>
                            <p className="font-extrabold text-xs">⚠️ {d.demerit_points} Pts (-{d.demerit_points * 5} XP)</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-bold uppercase text-ink/40">Efficiency Score</p>
                          <p className="figure font-extrabold text-primary-400 text-sm">{d.xp_score} XP</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Volunteer Certificate Generator Section */}
          <div className="space-y-4 pt-4 border-t border-rule">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <span>📜</span> Digital Certificate Generator ({safeVolunteers.length})
                </h3>
                <p className="text-xs text-ink/55 mt-0.5">
                  Click on any team member below to preview & print their official Certificate of Appreciation.
                </p>
              </div>
            </div>

            {safeVolunteers.length === 0 ? (
              <div className="bg-card border border-dashed border-rule rounded-2xl p-6 text-center text-xs text-ink/50">
                No active team members found in event roster. Assign team members in <strong>Users & Team</strong>!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {safeVolunteers.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleOpenCertificate(v)}
                    className="p-3.5 bg-card border border-rule hover:border-primary-500/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-well/40 transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full text-white font-bold flex items-center justify-center text-xs shadow-xs"
                        style={{ backgroundColor: v.avatar_color || '#6366f1' }}
                      >
                        {(v.name || v.email || 'V')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-ink text-xs truncate group-hover:text-primary-400 transition-colors">
                          {v.name || v.email}
                        </h4>
                        <p className="text-[10px] text-ink/50 truncate">
                          {v.dept_name || 'Event Team'} · <span className="capitalize">{v.role.replace('_', ' ')}</span>
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-primary-400 bg-primary-500/10 px-2 py-1 rounded-lg border border-primary-500/20 group-hover:bg-primary-500 group-hover:text-white transition-all whitespace-nowrap">
                      Certificate 📜
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certificate Modal Component */}
      {certModalUser && (
        <CertificateModal
          volunteer={certModalUser}
          eventName={event?.name || 'Event Fest 2026'}
          onClose={() => setCertModalUser(null)}
        />
      )}
    </div>
  )
}

export default function Leaderboard() {
  return <RequireActiveEvent>{(eventId) => <LeaderboardContent eventId={eventId} />}</RequireActiveEvent>
}
