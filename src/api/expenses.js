import client from './client'

export const listEstimatedExpenses = (eventId) => client.get('/api/expenses/estimated', { params: { event_id: eventId } }).then((r) => r.data)
export const createEstimatedExpense = (data) => client.post('/api/expenses/estimated', data).then((r) => r.data)
export const deleteEstimatedExpense = (id) => client.delete(`/api/expenses/estimated/${id}`).then((r) => r.data)

export const listActualExpenses = (eventId) => client.get('/api/expenses/actual', { params: { event_id: eventId } }).then((r) => r.data)
export const createActualExpense = (data) => client.post('/api/expenses/actual', data).then((r) => r.data)
export const deleteActualExpense = (id) => client.delete(`/api/expenses/actual/${id}`).then((r) => r.data)
