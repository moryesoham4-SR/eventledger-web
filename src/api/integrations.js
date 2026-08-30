import client from './client'

export function getGoogleSheetsConfig(eventId) {
  return client.get('/integrations/google-sheets', { params: { event_id: eventId } })
}

export function saveGoogleSheetsConfig(data) {
  return client.post('/integrations/google-sheets', data)
}

export function triggerSyncAll(eventId) {
  return client.post('/integrations/google-sheets/sync-all', { event_id: eventId })
}
