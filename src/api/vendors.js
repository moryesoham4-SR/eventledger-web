import client from './client'

export const listVendors = (eventId) => client.get('/api/vendors/', { params: { event_id: eventId } }).then((r) => r.data)
export const createVendor = (data) => client.post('/api/vendors/', data).then((r) => r.data)
export const deleteVendor = (id) => client.delete(`/api/vendors/${id}`).then((r) => r.data)
