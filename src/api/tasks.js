import client from './client'

export const listTasks = (eventId, deptId = null) =>
  client.get('/api/tasks', { params: { event_id: eventId, dept_id: deptId || undefined } }).then((r) => r.data)

export const createTask = (data) =>
  client.post('/api/tasks', data).then((r) => r.data)

export const updateTask = (id, data) =>
  client.put(`/api/tasks/${id}`, data).then((r) => r.data)

export const deleteTask = (id) =>
  client.delete(`/api/tasks/${id}`).then((r) => r.data)
