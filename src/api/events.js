import client from './client'

export const listEvents = () => client.get('/api/events/').then((r) => r.data)
export const getEvent = (id) => client.get(`/api/events/${id}`).then((r) => r.data)
export const getEventSummary = (id) => client.get(`/api/events/${id}/summary`).then((r) => r.data)
export const createEvent = (data) => client.post('/api/events/', data).then((r) => r.data)
export const updateEvent = (id, data) => client.put(`/api/events/${id}`, data).then((r) => r.data)
export const deleteEvent = (id) => client.delete(`/api/events/${id}`).then((r) => r.data)
