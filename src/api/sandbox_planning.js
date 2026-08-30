import client from './client'

export function getSandboxData(eventId) {
  return client.get('/sandbox-planning/', { params: { event_id: eventId } })
}

export function createScenario(data) {
  return client.post('/sandbox-planning/scenario', data)
}

export function deleteScenario(scenarioId) {
  return client.delete(`/sandbox-planning/scenario/${scenarioId}`)
}

export function createSandboxDepartment(data) {
  return client.post('/sandbox-planning/department', data)
}

export function deleteSandboxDepartment(deptId) {
  return client.delete(`/sandbox-planning/department/${deptId}`)
}

export function createSandboxItem(data) {
  return client.post('/sandbox-planning/item', data)
}

export function deleteSandboxItem(itemId) {
  return client.delete(`/sandbox-planning/item/${itemId}`)
}

export function mergeToMainEvent(data) {
  return client.post('/sandbox-planning/merge-to-main', data)
}
