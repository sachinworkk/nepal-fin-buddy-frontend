import { useQuery } from '@tanstack/react-query'
import { listPaymentMethods } from '../api/lookups'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../api/expenses'

export interface PaymentMethodOption {
  value: string
  label: string
}

/** Payment-method options from `/payment-methods`. */
export function usePaymentMethods() {
  const { data } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: listPaymentMethods,
    staleTime: Infinity,
  })
  const options: PaymentMethodOption[] = data
    ? data.map((m) => ({ value: m.code, label: m.label_en }))
    : PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))
  const labelOf = (code?: string | null) =>
    options.find((o) => o.value === code)?.label ?? code ?? ''
  return { options, labelOf }
}
