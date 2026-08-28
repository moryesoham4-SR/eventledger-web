import { createContext, useContext, useState, useEffect } from 'react'
import * as eventsApi from '../api/events'

const EventContext = createContext(null)

export function EventProvider({ children }) {
  const [events, setEvents] = useState([])
  const [activeEventId, setActiveEventId] = useState(
    () => localStorage.getItem('active_event_id') || null
  )
  const [loading, setLoading] = useState(true)
  const [cache, setCache] = useState({}) // eventId -> summary cache

  const refreshEvents = async () => {
    try {
      const data = await eventsApi.listEvents()
      const safeData = Array.isArray(data) ? data : []
      setEvents(safeData)
      if (safeData.length > 0) {
        const exists = safeData.some((e) => String(e.id) === String(activeEventId))
        if (!activeEventId || !exists) {
          setActiveEventId(String(safeData[0].id))
        }
      } else {
        setActiveEventId(null)
      }
    } catch (err) {
      setEvents([])
      setActiveEventId(null)
    } finally {
      setLoading(false)
    }
  }

  const setCachedData = (key, data) => {
    setCache((prev) => ({ ...prev, [key]: data }))
  }

  const getCachedData = (key) => cache[key] || null

  useEffect(() => {
    refreshEvents()
  }, [])

  useEffect(() => {
    if (activeEventId) {
      localStorage.setItem('active_event_id', activeEventId)
    } else {
      localStorage.removeItem('active_event_id')
    }
  }, [activeEventId])

  return (
    <EventContext.Provider
      value={{ events, activeEventId, setActiveEventId, loading, refreshEvents, getCachedData, setCachedData }}
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
