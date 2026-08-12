import { createContext, useContext, useState, useEffect } from 'react'
import * as eventsApi from '../api/events'

const EventContext = createContext(null)

export function EventProvider({ children }) {
  const [events, setEvents] = useState([])
  const [activeEventId, setActiveEventId] = useState(
    () => localStorage.getItem('active_event_id') || null
  )
  const [loading, setLoading] = useState(true)

  const refreshEvents = async () => {
    setLoading(true)
    try {
      const data = await eventsApi.listEvents()
      setEvents(data)
      // If no active event selected yet, default to the first one
      if (!activeEventId && data.length > 0) {
        setActiveEventId(String(data[0].id))
      }
    } catch (err) {
      // fail silently — pages will show their own errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeEventId) {
      localStorage.setItem('active_event_id', activeEventId)
    }
  }, [activeEventId])

  return (
    <EventContext.Provider
      value={{ events, activeEventId, setActiveEventId, loading, refreshEvents }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useActiveEvent() {
  const ctx = useContext(EventContext)
  if (!ctx) throw new Error('useActiveEvent must be used within EventProvider')
  return ctx
}
