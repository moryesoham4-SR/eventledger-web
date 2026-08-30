import client from './client'

export function getGoogleSheetsConfig(eventId) {
  return client.get('/api/integrations/google-sheets', { params: { event_id: eventId } }).then((r) => r.data)
}

export function saveGoogleSheetsConfig(data) {
  return client.post('/api/integrations/google-sheets', data).then((r) => r.data)
}

export function triggerSyncAll(eventId) {
  return client.post('/api/integrations/google-sheets/sync-all', { event_id: eventId }).then((r) => r.data)
}
