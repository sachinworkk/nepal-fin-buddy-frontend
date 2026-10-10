import { get, patch, post } from './client'

export interface TokenOut {
  access_token: string
}

export interface UserOut {
  id: string
  email: string
  full_name: string | null
}

export const login = (email: string, password: string) =>
  post<TokenOut>('/auth/login', { email, password })

export const register = (body: {
  email: string
  password: string
  full_name: string
}) => post<TokenOut>('/auth/register', body)

export const getMe = () => get<UserOut>('/auth/me')

export const updateMe = (body: { full_name?: string | null }) =>
  patch<UserOut>('/auth/me', body)
