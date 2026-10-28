const base = (import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

export async function request(path, { token, body, signal, method = 'GET', raw = false, responseType = 'json', timeoutMs = 15000 } = {}) {
  let response
  try {
    response = await fetch(`${base}${path}`, {
      method, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs), cache: 'no-store',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': raw ? 'application/octet-stream' : 'application/json' }) },
      ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Cannot reach the API. Check that the backend is running and the API URL and CORS origin are correct.', 0)
  }
  if (response.status === 204) return null
  if (response.ok && responseType === 'blob') return response.blob()
  let data
  try { data = await response.json() } catch { throw new ApiError('The API returned an unreadable response.', response.status) }
  if (!response.ok) {
    const validation = Array.isArray(data?.error?.details) ? data.error.details : Array.isArray(data?.detail) ? data.detail : []
    const details = validation.filter(item => item && typeof item === 'object').map(item => {
      const location = Array.isArray(item.location) ? item.location : Array.isArray(item.loc) ? item.loc : []
      const message = typeof item.message === 'string' ? item.message : typeof item.msg === 'string' ? item.msg : ''
      return message ? [location.slice(1).join('.'), message].filter(Boolean).join(': ') : ''
    }).filter(Boolean).join('; ')
    const message = typeof data?.error?.message === 'string' ? data.error.message : typeof data?.detail === 'string' ? data.detail : ''
    throw new ApiError(details || message || 'The request failed. Please try again.', response.status)
  }
  return data
}

export function queryString(values) {
  return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value !== undefined)).toString()
}
