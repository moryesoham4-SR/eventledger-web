import client from './client'

export const getSponsorshipTiers = (eventId) =>
  client.get(`/api/sponsorship/events/${eventId}/tiers`).then((r) => r.data)

export const createSponsorshipTier = (eventId, data) =>
  client.post(`/api/sponsorship/events/${eventId}/tiers`, data).then((r) => r.data)

export const deleteSponsorshipTier = (tierId) =>
  client.delete(`/api/sponsorship/tiers/${tierId}`).then((r) => r.data)

export const getSponsorDeliverables = (sponsorId) =>
  client.get(`/api/sponsorship/sponsors/${sponsorId}/deliverables`).then((r) => r.data)

export const addSponsorDeliverable = (sponsorId, data) =>
  client.post(`/api/sponsorship/sponsors/${sponsorId}/deliverables`, data).then((r) => r.data)

export const toggleDeliverableStatus = (deliverableId) =>
  client.post(`/api/sponsorship/deliverables/${deliverableId}/toggle`).then((r) => r.data)

export const deleteDeliverable = (deliverableId) =>
  client.delete(`/api/sponsorship/deliverables/${deliverableId}`).then((r) => r.data)
