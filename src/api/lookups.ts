import { get } from './client'

export interface PaymentMethodRow {
  code: string
  label_en: string
  label_ne: string
}

export const listPaymentMethods = () => get<PaymentMethodRow[]>('/payment-methods')
