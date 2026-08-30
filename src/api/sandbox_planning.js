import client from './client'

export function getSandboxData(eventId) {
  return client.get('/api/sandbox-planning/', { params: { event_id: eventId } })
}

export function createScenario(data) {
  return client.post('/api/sandbox-planning/scenario', data)
}

export function deleteScenario(scenarioId) {
  return client.delete(`/api/sandbox-planning/scenario/${scenarioId}`)
}

export function createSandboxDepartment(data) {
  return client.post('/api/sandbox-planning/department', data)
}

export function deleteSandboxDepartment(deptId) {
  return client.delete(`/api/sandbox-planning/department/${deptId}`)
}

export function createSandboxItem(data) {
  return client.post('/api/sandbox-planning/item', data)
}

export function deleteSandboxItem(itemId) {
  return client.delete(`/api/sandbox-planning/item/${itemId}`)
}

export function mergeToMainEvent(data) {
  return client.post('/api/sandbox-planning/merge-to-main', data)
}
