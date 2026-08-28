import client from './client'

export const listDepartments = (eventId) => client.get('/api/departments/', { params: { event_id: eventId } }).then((r) => r.data)
export const createDepartment = (data) => client.post('/api/departments/', data).then((r) => r.data)
export const deleteDepartment = (id) => client.delete(`/api/departments/${id}`).then((r) => r.data)
export const getDepartmentRoster = (deptId) => client.get(`/api/departments/${deptId}/roster`).then((r) => r.data)
export const assignDepartmentMember = (deptId, data) => client.post(`/api/departments/${deptId}/assign-member`, data).then((r) => r.data)
export const removeDepartmentMember = (deptId, userId) => client.delete(`/api/departments/${deptId}/members/${userId}`).then((r) => r.data)
