import client from './client'

export const listSponsors = (eventId) => client.get('/api/sponsors/', { params: { event_id: eventId } }).then((r) => r.data)
export const createSponsor = (data) => client.post('/api/sponsors/', data).then((r) => r.data)
export const deleteSponsor = (id) => client.delete(`/api/sponsors/${id}`).then((r) => r.data)
