import client from './client'

export const listNotifications = () => client.get('/api/notifications/').then((r) => r.data)
export const getUnreadCount = () => client.get('/api/notifications/unread-count').then((r) => r.data)
export const markRead = (id) => client.post(`/api/notifications/${id}/read`).then((r) => r.data)
export const markAllRead = () => client.post('/api/notifications/read-all').then((r) => r.data)
