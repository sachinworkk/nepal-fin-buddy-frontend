import { del, get, put } from './client'

export interface IrdCredentialsOut {
  username: string
  seller_pan: string
  has_password: boolean
  updated_at: string
}

export interface IrdCredentialsIn {
  username: string
  password: string
  seller_pan: string
}

export const getIrdCredentials = () => get<IrdCredentialsOut>('/settings/ird-credentials')
export const saveIrdCredentials = (body: IrdCredentialsIn) =>
  put<IrdCredentialsOut>('/settings/ird-credentials', body)
export const deleteIrdCredentials = () => del('/settings/ird-credentials')
