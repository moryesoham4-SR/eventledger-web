import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://eventledger-api.onrender.com'

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request if present
client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401 (expired/invalid token)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client

/**
 * Always returns a plain string for display, no matter what shape the
 * backend error took. FastAPI validation errors (422) send `detail` as an
 * ARRAY of {loc, msg, type} objects, not a string — rendering that directly
 * in JSX crashes the whole page (React can't render a plain object as a
 * child). Every catch block should use this instead of reading
 * err.response?.data?.detail directly.
 */
export function getErrorMessage(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join('; ')
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  return fallback
}

/**
 * Same job as getErrorMessage, but for requests made with `responseType:
 * 'blob'` (file downloads). Axios returns the error body as a Blob too in
 * that case — not parsed JSON — so `err.response.data.detail` is always
 * undefined and callers silently fall back to a generic message no matter
 * what actually went wrong (expired session, missing permission, server
 * error). This reads the Blob as text and parses it the same way, so
 * download failures show their real cause. Always await this in a catch
 * block instead of getErrorMessage when the request used responseType: 'blob'.
 */
export async function getBlobErrorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text()
      const parsed = JSON.parse(text)
      return getErrorMessage({ response: { data: parsed } }, fallback)
    } catch {
      return fallback
    }
  }
  return getErrorMessage(err, fallback)
}
