import client from './client'

export const listActivity = (eventId, limit = 50) =>
  client.get(`/api/events/${eventId}/activity`, { params: { limit } }).then((r) => r.data)
