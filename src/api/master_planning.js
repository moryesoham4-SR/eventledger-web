import client from './client'

export function getMasterPlan(eventId) {
  return client.get('/api/master-planning/', { params: { event_id: eventId } })
}

export function updateStrategy(data) {
  return client.post('/api/master-planning/strategy', data)
}

export function saveBudgetPlans(data) {
  return client.post('/api/master-planning/budget-plan', data)
}

export function createMilestone(data) {
  return client.post('/api/master-planning/milestone', data)
}

export function updateMilestone(milestoneId, data) {
  return client.put(`/api/master-planning/milestone/${milestoneId}`, data)
}

export function deleteMilestone(milestoneId) {
  return client.delete(`/api/master-planning/milestone/${milestoneId}`)
}

export function createRisk(data) {
  return client.post('/api/master-planning/risk', data)
}

export function deleteRisk(riskId) {
  return client.delete(`/api/master-planning/risk/${riskId}`)
}
