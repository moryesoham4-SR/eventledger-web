import client from './client'

export const login = (email, password) =>
  client.post('/api/auth/login', { email, password }).then((res) => res.data)

export const register = (name, email, password, org_name = '') =>
  client.post('/api/auth/register', { name, email, password, org_name }).then((res) => res.data)

export const googleLogin = (idToken) =>
  client.post('/api/auth/google', { id_token: idToken }).then((res) => res.data)

export const requestPasswordReset = (email) =>
  client.post('/api/auth/forgot-password', { email }).then((res) => res.data)

export const confirmPasswordReset = (data) =>
  client.post('/api/auth/reset-password-confirm', data).then((res) => res.data)
