import { get } from './client'

export interface DateConversion {
  ad: string
  bs: string
  bs_label: string
}

export const convertDate = (q: { ad: string } | { bs: string }) =>
  get<DateConversion>(`/dates/convert?${new URLSearchParams(q).toString()}`)
