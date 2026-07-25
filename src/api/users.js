import client from './client'

export const listUsers = () => client.get('/api/users/').then((r) => r.data)
export const listUsersByEvent = (eventId) => client.get(`/api/users/event/${eventId}`).then((r) => r.data)
export const assignRole = (data) => client.post('/api/users/assign-role', data).then((r) => r.data)
export const resetPassword = (data) => client.post('/api/users/reset-password', data).then((r) => r.data)
export const getAuditLog = () => client.get('/api/users/audit-log').then((r) => r.data)
