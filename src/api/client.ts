export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const getToken = () => localStorage.getItem('token')

interface ValidationItem {
  loc?: (string | number)[]
  msg?: string
}

// FastAPI errors: `{detail: string}` or, for 422, `{detail: [{loc, msg}]}`.
function parseDetail(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const parts = (detail as ValidationItem[]).map((d) => {
      const field = (d.loc ?? []).filter((p) => p !== 'body' && p !== 'query').join('.')
      const msg = d.msg ?? 'Invalid value'
      return field ? `${field}: ${msg}` : msg
    })
    if (parts.length) return parts.join('; ')
  }
  return fallback
}

function handleUnauthorized(sentToken: boolean) {
  // Only treat 401 as an expired session when we actually sent a token;
  // a wrong password on /auth/login is also a 401.
  if (!sentToken) return
  localStorage.removeItem('token')
  window.location.assign('/login')
}

async function toError(res: Response): Promise<ApiError> {
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, parseDetail(body, res.statusText || `Error ${res.status}`))
}

async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const isForm = init.body instanceof FormData
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (res.status === 401) {
    handleUnauthorized(!!token)
    throw new ApiError(401, token ? 'Session expired — log in again' : await toError(res).then((e) => e.message))
  }
  if (!res.ok) throw await toError(res)
  return res
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await raw(path, init)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

export const get = <T,>(path: string) => request<T>(path)
export const post = <T,>(path: string, body?: unknown) => request<T>(path, json('POST', body ?? {}))
export const put = <T,>(path: string, body: unknown) => request<T>(path, json('PUT', body))
export const patch = <T,>(path: string, body: unknown) => request<T>(path, json('PATCH', body))
export const del = (path: string) => request<void>(path, { method: 'DELETE' })

export async function getWithTotal<T>(path: string): Promise<{ items: T[]; total: number }> {
  const res = await raw(path)
  const items = (await res.json()) as T[]
  const header = res.headers.get('X-Total-Count')
  return { items, total: header === null ? items.length : Number(header) }
}

export async function getBlob(path: string): Promise<Blob> {
  return (await raw(path)).blob()
}

export function uploadFile<T>(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<T> {
  const token = getToken()
  const body = new FormData()
  body.append('file', file)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}${path}`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let parsed: unknown = null
      try {
        parsed = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON body */
      }
      if (xhr.status === 401) {
        handleUnauthorized(!!token)
        reject(new ApiError(401, 'Session expired — log in again'))
      } else if (xhr.status >= 400) {
        reject(new ApiError(xhr.status, parseDetail(parsed, xhr.statusText || `Error ${xhr.status}`)))
      } else {
        resolve(parsed as T)
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(body)
  })
}
