import { lookupLabel, usePaymentMethods } from '../api/lookups'

/** Radio-style picker; clicking the selected option clears it (`null`). */
export default function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const { data, isError, error } = usePaymentMethods()
  return (
    <div className="field">
      <span>Payment method</span>
      <div className="pay-group" role="radiogroup" aria-label="Payment method">
        {(data ?? []).map((m) => {
          const on = value === m.code
          return (
            <button
              key={m.code}
              type="button"
              role="radio"
              aria-checked={on}
              className={on ? 'pay-btn on' : 'pay-btn'}
              onClick={() => onChange(on ? null : m.code)}
            >
              {lookupLabel(m)}
            </button>
          )
        })}
      </div>
      {isError && (
        <p className="form-error">{error instanceof Error ? error.message : String(error)}</p>
      )}
    </div>
  )
}
