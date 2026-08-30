import client from './client'

export function getMasterPlan(eventId) {
  return client.get('/master-planning/', { params: { event_id: eventId } })
}

export function updateStrategy(data) {
  return client.post('/master-planning/strategy', data)
}

export function saveBudgetPlans(data) {
  return client.post('/master-planning/budget-plan', data)
}

export function createMilestone(data) {
  return client.post('/master-planning/milestone', data)
}

export function updateMilestone(milestoneId, data) {
  return client.put(`/master-planning/milestone/${milestoneId}`, data)
}

export function deleteMilestone(milestoneId) {
  return client.delete(`/master-planning/milestone/${milestoneId}`)
}

export function createRisk(data) {
  return client.post('/master-planning/risk', data)
}

export function deleteRisk(riskId) {
  return client.delete(`/master-planning/risk/${riskId}`)
}
