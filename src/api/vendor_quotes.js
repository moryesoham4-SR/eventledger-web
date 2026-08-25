import client from './client'

export const getProposalQuotes = (proposalId) =>
  client.get(`/api/budget/proposals/${proposalId}/quotes`).then((r) => r.data)

export const addVendorQuote = (proposalId, data) =>
  client.post(`/api/budget/proposals/${proposalId}/quotes`, data).then((r) => r.data)

export const selectVendorQuote = (proposalId, quoteId) =>
  client.post(`/api/budget/proposals/${proposalId}/quotes/${quoteId}/select`).then((r) => r.data)

export const deleteVendorQuote = (proposalId, quoteId) =>
  client.delete(`/api/budget/proposals/${proposalId}/quotes/${quoteId}`).then((r) => r.data)
