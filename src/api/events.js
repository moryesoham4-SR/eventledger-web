import client from './client'

export const listEvents = () => client.get('/api/events/').then((r) => r.data)
export const getEvent = (id) => client.get(`/api/events/${id}`).then((r) => r.data)
export const getEventSummary = (id) => client.get(`/api/events/${id}/summary`).then((r) => r.data)
export const createEvent = (data) => client.post('/api/events/', data).then((r) => r.data)
export const updateEvent = (id, data) => client.put(`/api/events/${id}`, data).then((r) => r.data)
export const deleteEvent = (id) => client.delete(`/api/events/${id}`).then((r) => r.data)

export const exportEventData = (id) =>
  client.get(`/api/events/${id}/export`, { responseType: 'blob' }).then((r) => r.data)

export const importEventData = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return client
    .post(`/api/events/${id}/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data)
}
