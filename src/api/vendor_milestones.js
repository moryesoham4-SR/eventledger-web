import client from './client'

export const getVendorMilestones = (vendorId) =>
  client.get(`/api/vendors/${vendorId}/milestones`).then((r) => r.data)

export const createVendorMilestone = (data) =>
  client.post('/api/vendors/milestones', data).then((r) => r.data)

export const autoGenerateMilestones = (vendorId) =>
  client.post(`/api/vendors/${vendorId}/auto-generate-milestones`).then((r) => r.data)

export const updateVendorMilestone = (id, data) =>
  client.put(`/api/vendors/milestones/${id}`, data).then((r) => r.data)

export const deleteVendorMilestone = (id) =>
  client.delete(`/api/vendors/milestones/${id}`).then((r) => r.data)

export const getEventMilestonesSchedule = (eventId) =>
  client.get(`/api/vendors/events/${eventId}/milestones-schedule`).then((r) => r.data)
