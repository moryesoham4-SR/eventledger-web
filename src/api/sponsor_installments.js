import client from './client'

export const getSponsorInstallments = (sponsorId) =>
  client.get(`/api/sponsors/${sponsorId}/installments`).then((r) => r.data)

export const createSponsorInstallment = (data) =>
  client.post('/api/sponsors/installments', data).then((r) => r.data)

export const autoGenerateSponsorInstallments = (sponsorId) =>
  client.post(`/api/sponsors/${sponsorId}/auto-generate-installments`).then((r) => r.data)

export const updateSponsorInstallment = (id, data) =>
  client.put(`/api/sponsors/installments/${id}`, data).then((r) => r.data)

export const deleteSponsorInstallment = (id) =>
  client.delete(`/api/sponsors/installments/${id}`).then((r) => r.data)

export const getEventSponsorReceivables = (eventId) =>
  client.get(`/api/sponsors/events/${eventId}/receivables-schedule`).then((r) => r.data)
