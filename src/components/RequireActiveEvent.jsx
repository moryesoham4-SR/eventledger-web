import { Link } from 'react-router-dom'
import { useActiveEvent } from '../context/EventContext'

/**
 * Wraps a page that needs an active event selected (via the sidebar switcher).
 * Renders children with `eventId` injected once one is available.
 */
export default function RequireActiveEvent({ children }) {
  const { activeEventId, events, loading } = useActiveEvent()

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>

  if (events.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600 mb-4">You need an event before you can use this section.</p>
        <Link
          to="/events"
          className="inline-block bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700"
        >
          Create an event
        </Link>
      </div>
    )
  }

  if (!activeEventId) {
    return <p className="text-gray-500 text-sm">Select an active event from the sidebar to continue.</p>
  }

  return children(activeEventId)
}
