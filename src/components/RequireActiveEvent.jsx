import { Link } from 'react-router-dom'
import { useActiveEvent } from '../context/EventContext'

/**
 * Wraps a page that needs an active event selected (via the sidebar switcher).
 * Renders children with `eventId` injected once one is available.
 */
export default function RequireActiveEvent({ children }) {
  const { activeEventId, events, loading } = useActiveEvent()

  if (loading) return <p className="text-ink/55 text-sm">Loading...</p>

  if (events.length === 0) {
    return (
      <div className="bg-card border border-rule rounded-xl p-8 text-center">
        <p className="text-ink/70 mb-4">You need an event before you can use this section.</p>
        <Link
          to="/events"
          className="inline-block bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
        >
          Create an event
        </Link>
      </div>
    )
  }

  if (!activeEventId) {
    return <p className="text-ink/55 text-sm">Select an active event from the sidebar to continue.</p>
  }

  return children(activeEventId)
}
