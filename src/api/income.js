import client from './client'

export const listEstimatedIncome = (eventId) => client.get('/api/income/estimated', { params: { event_id: eventId } }).then((r) => r.data)
export const createEstimatedIncome = (data) => client.post('/api/income/estimated', data).then((r) => r.data)
export const deleteEstimatedIncome = (id) => client.delete(`/api/income/estimated/${id}`).then((r) => r.data)

export const listActualIncome = (eventId) => client.get('/api/income/actual', { params: { event_id: eventId } }).then((r) => r.data)
export const createActualIncome = (data) => client.post('/api/income/actual', data).then((r) => r.data)
export const deleteActualIncome = (id) => client.delete(`/api/income/actual/${id}`).then((r) => r.data)
