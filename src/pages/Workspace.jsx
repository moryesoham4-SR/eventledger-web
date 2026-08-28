import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActiveEvent } from '../context/EventContext'
import { useAuth } from '../context/AuthContext'
import StampBadge from '../components/StampBadge'

export default function Workspace() {
  const { user } = useAuth()
  const { events, activeEventId, setActiveEventId, loading } = useActiveEvent()
  const navigate = useNavigate()

  const safeEvents = Array.isArray(events) ? events : []

  useEffect(() => {
    if (!loading && activeEventId) {
      navigate('/dashboard', { replace: true })
    }
  }, [activeEventId, loading, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="skeleton h-12 w-48 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">
            Welcome to your Workspace{user?.name ? `, ${user.name}` : ''} 👋
          </h2>
          <p className="text-sm text-ink/60 mt-1">
            Select an event below to open its dashboard and start collaborating.
          </p>
        </div>
        <Link
          to="/events"
          className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs transition-all"
        >
          + Create New Event
        </Link>
      </div>

      {safeEvents.length === 0 ? (
        <div className="bg-card border border-rule rounded-2xl p-10 text-center space-y-3">
          <span className="text-4xl">🎉</span>
          <h3 className="font-display text-lg font-semibold text-ink">No events yet</h3>
          <p className="text-sm text-ink/60 max-w-sm mx-auto">
            Get started by creating your first event ledger to track budgets, expenses, and team tasks.
          </p>
          <Link
            to="/events"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-xs transition-all"
          >
            Create First Event →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => {
                setActiveEventId(String(ev.id))
                navigate('/dashboard')
              }}
              className="lift bg-card border border-rule rounded-2xl p-5 hover:border-primary-500/40 cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-ink truncate">{ev.name}</h3>
                {ev.status && <StampBadge status={ev.status} size="xs" />}
              </div>
              <p className="text-xs text-ink/55">
                {[ev.venue, ev.start_date].filter(Boolean).join(' · ') || 'No date set'}
              </p>
              <div className="pt-2 border-t border-rule/60 flex items-center justify-between text-xs font-semibold text-primary-400">
                <span>Open Dashboard →</span>
                <span className="text-[10px] text-ink/40">ID #{ev.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
