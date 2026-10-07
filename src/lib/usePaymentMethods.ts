import { useQuery } from '@tanstack/react-query'
import { listPaymentMethods } from '../api/lookups'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../api/expenses'
import { useMe } from './useMe'

export interface PaymentMethodOption {
  value: string
  label: string
}

/** Payment-method options from `/payment-methods`, labelled in the user's language. */
export function usePaymentMethods() {
  const { data: me } = useMe()
  const { data } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: listPaymentMethods,
    staleTime: Infinity,
  })
  const ne = me?.preferred_language === 'ne'
  const options: PaymentMethodOption[] = data
    ? data.map((m) => ({ value: m.code, label: ne ? m.label_ne : m.label_en }))
    : PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))
  const labelOf = (code?: string | null) =>
    options.find((o) => o.value === code)?.label ?? code ?? ''
  return { options, labelOf }
}
