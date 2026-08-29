import { useEffect, useState } from 'react'
import RequireActiveEvent from '../components/RequireActiveEvent'
import * as leaderboardApi from '../api/leaderboard'
import CertificateModal from '../components/CertificateModal'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../api/client'

function LeaderboardContent({ eventId }) {
  const toast = useToast()
  const [data, setData] = useState({ departments: [], volunteers: [] })
  const [loading, setLoading] = useState(true)

  // Certificate Modal State
  const [certModalData, setCertModalData] = useState(null)

  const loadData = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const res = await leaderboardApi.getLeaderboard(eventId)
      setData(res)
    } catch {
      setData({ departments: [], volunteers: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [eventId])

  const handleGenerateCertificate = async (vol) => {
    try {
      const payload = await leaderboardApi.generateCertificatePayload({
        event_id: Number(eventId),
        user_name: vol.name || vol.email,
        user_role: vol.role ? vol.role.replace('_', ' ') : 'Co-Worker',
        department_name: vol.dept_name || 'Event Operations',
        award_title: 'Certificate of Appreciation',
        citation: 'In recognition of outstanding dedication, leadership, and exemplary event management service.',
        signatory_title_1: 'Event Admin / Lead',
        signatory_name_1: 'Event Director',
        signatory_title_2: 'Faculty Coordinator',
        signatory_name_2: 'Dean of Student Affairs',
      })
      setCertModalData(payload)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to generate certificate'))
    }
  }

  const topThree = data.departments.slice(0, 3)

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
            <span>🏆</span> Department Leaderboard & Awards
          </h2>
          <p className="text-sm text-ink/60 mt-1">
            Real-time department efficiency rankings and digital certificate generator for co-workers & volunteers.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : data.departments.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-sm text-ink/60">No department efficiency data available yet.</p>
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
              <span>📊</span> All Departments Performance Breakdowns
            </h3>
            <div className="bg-card border border-rule rounded-2xl overflow-hidden shadow-xs divide-y divide-rule text-xs">
              {data.departments.map((d) => (
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
                    <div>
                      <p className="text-[10px] font-bold uppercase text-ink/40">Efficiency Score</p>
                      <p className="figure font-extrabold text-primary-400 text-sm">{d.xp_score} XP</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volunteer Certificate Issuance Roster */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <span>📜</span> Volunteer & Co-Worker Appreciation Certificates ({data.volunteers.length})
              </h3>
            </div>

            {data.volunteers.length === 0 ? (
              <p className="text-xs text-ink/40 italic">No volunteers registered for this event yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.volunteers.map((v) => (
                  <div key={v.id} className="p-4 bg-card border border-rule rounded-xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-well text-ink font-bold flex items-center justify-center text-xs border border-rule">
                        🤝
                      </span>
                      <div>
                        <h4 className="font-bold text-ink text-sm">{v.name || v.email}</h4>
                        <p className="text-[11px] text-ink/50">
                          {v.dept_name || 'General Operations'} · Tasks: {v.tasks_completed}/{v.tasks_assigned}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleGenerateCertificate(v)}
                      className="bg-primary-600/15 hover:bg-primary-600 text-primary-400 hover:text-white border border-primary-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-xs"
                    >
                      <span>📜</span> Certificate
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Certificate Modal */}
      {certModalData && (
        <CertificateModal
          certData={certModalData}
          onClose={() => setCertModalData(null)}
        />
      )}
    </div>
  )
}

export default function Leaderboard() {
  return <RequireActiveEvent>{(eventId) => <LeaderboardContent eventId={eventId} />}</RequireActiveEvent>
}
