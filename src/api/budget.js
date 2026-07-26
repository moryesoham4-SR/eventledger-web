import client from './client'

export const listProposals = (eventId) => client.get('/api/budget/proposals', { params: { event_id: eventId } }).then((r) => r.data)
export const getProposal = (id) => client.get(`/api/budget/proposals/${id}`).then((r) => r.data)
export const createProposal = (data) => client.post('/api/budget/proposals', data).then((r) => r.data)
export const submitProposal = (id) => client.post(`/api/budget/proposals/${id}/submit`).then((r) => r.data)
export const approveProposal = (id) => client.post(`/api/budget/proposals/${id}/approve`).then((r) => r.data)
export const rejectProposal = (id, reason) => client.post(`/api/budget/proposals/${id}/reject`, { reason }).then((r) => r.data)
export const addLineItem = (data) => client.post('/api/budget/line-items', data).then((r) => r.data)
export const deleteLineItem = (id) => client.delete(`/api/budget/line-items/${id}`).then((r) => r.data)
