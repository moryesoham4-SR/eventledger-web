import client from './client'

export const listDepartments = (eventId) => client.get('/api/departments/', { params: { event_id: eventId } }).then((r) => r.data)
export const createDepartment = (data) => client.post('/api/departments/', data).then((r) => r.data)
export const deleteDepartment = (id) => client.delete(`/api/departments/${id}`).then((r) => r.data)
