import { useQuery } from '@tanstack/react-query'
import { get } from './client'

export interface CategoryOption {
  slug: string
  label_en: string
  label_ne: string
}

export interface PaymentMethodOption {
  code: string
  label_en: string
  label_ne: string
}

export const getCategories = () => get<CategoryOption[]>('/categories')
export const getPaymentMethods = () => get<PaymentMethodOption[]>('/payment-methods')

// The lists only change on a backend migration, so they never go stale.
export const useCategories = () =>
  useQuery({ queryKey: ['lookups', 'categories'], queryFn: getCategories, staleTime: Infinity })

export const usePaymentMethods = () =>
  useQuery({ queryKey: ['lookups', 'payment-methods'], queryFn: getPaymentMethods, staleTime: Infinity })

/** Display label for a lookup row. TODO(i18n): pick `label_ne` here when a Nepali locale is added. */
export const lookupLabel = (o: { label_en: string; label_ne: string }) => o.label_en

/** Label for a category slug, falling back to the slug while loading or if unknown. */
export const categoryLabel = (list: CategoryOption[] | undefined, slug: string) => {
  const c = list?.find((x) => x.slug === slug)
  return c ? lookupLabel(c) : slug
}
