import client from './client'

export const getMyRole = (eventId) =>
  client.get('/api/users/my-role', { params: { event_id: eventId } }).then((r) => r.data)

export const listUsers = () => client.get('/api/users/').then((r) => r.data)
export const listUsersByEvent = (eventId) => client.get(`/api/users/event/${eventId}`).then((r) => r.data)
export const getEventTeam = (eventId) => client.get(`/api/users/event-team/${eventId}`).then((r) => r.data)
export const inviteMember = (data) => client.post('/api/users/invite-member', data).then((r) => r.data)
export const assignRole = (data) => client.post('/api/users/assign-role', data).then((r) => r.data)
export const resetPassword = (data) => client.post('/api/users/reset-password', data).then((r) => r.data)
export const getAuditLog = () => client.get('/api/users/audit-log').then((r) => r.data)

export const getMyProfile = () => client.get('/api/users/me').then((r) => r.data)
export const updateMyProfile = (data) => client.put('/api/users/me', data).then((r) => r.data)
export const changeMyPassword = (data) => client.post('/api/users/me/change-password', data).then((r) => r.data)
export const deleteMyAccount = () => client.delete('/api/users/me').then((r) => r.data)
