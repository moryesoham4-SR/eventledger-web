import client from './client'

export const listReimbursements = (eventId) =>
  client.get('/api/reimbursements/', { params: { event_id: eventId } }).then((r) => r.data)

export const submitReimbursement = (data) =>
  client.post('/api/reimbursements/', data).then((r) => r.data)

export const deptHeadApproveClaim = (claimId, data) =>
  client.put(`/api/reimbursements/${claimId}/dept-approval`, data).then((r) => r.data)

export const financeHeadPayoutClaim = (claimId, data) =>
  client.put(`/api/reimbursements/${claimId}/finance-payout`, data).then((r) => r.data)

export const deleteReimbursement = (claimId) =>
  client.delete(`/api/reimbursements/${claimId}`).then((r) => r.data)
