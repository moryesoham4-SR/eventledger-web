import client from './client'

export const getLeaderboard = (eventId) =>
  client.get('/api/leaderboard/', { params: { event_id: eventId } }).then((r) => r.data)

export const toggleCertificates = (eventId, enabled) =>
  client.post(`/api/leaderboard/${eventId}/toggle-certificates`, { enabled }).then((r) => r.data)

export const generateCertificatePayload = (data) =>
  client.post('/api/certificates/generate', data).then((r) => r.data)
