import { useState } from 'react'
import { loadDateMode, saveDateMode, toAsciiDigits, useBsConvert, type DateMode } from '../lib/dates'

export interface DateValue {
  ad?: string
  bs?: string
}

type Mode = DateMode

interface Props {
  label: string
  value: DateValue
  onChange: (v: DateValue) => void
  bsOnly?: boolean
  required?: boolean
}

/** AD/BS date entry. Emits exactly one of {ad} / {bs} (or {} when empty). */
export default function DateInput({ label, value, onChange, bsOnly, required }: Props) {
  const [pref, setPref] = useState<Mode>(loadDateMode)
  const mode: Mode = bsOnly ? 'bs' : pref

  const conv = useBsConvert(
    mode === 'ad' ? (value.ad ? { ad: value.ad } : null) : value.bs ? { bs: value.bs } : null,
  )

  function switchMode(next: Mode) {
    if (next === mode) return
    setPref(next)
    saveDateMode(next)
    // Carry the converted value across when we know it.
    if (next === 'bs') onChange(conv.data ? { bs: conv.data.bs } : {})
    else onChange(conv.data ? { ad: conv.data.ad } : {})
  }

  let preview = ''
  if (conv.data) {
    preview = mode === 'bs' ? `= ${new Date(conv.data.ad + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : `= ${conv.data.bs_label}`
  }
  const err = conv.error instanceof Error ? conv.error.message : ''
  const status = err || preview || (conv.isFetching ? 'Converting…' : '')

  return (
    <div className="field">
      <span>
        {label}
        {!bsOnly && (
          <span className="seg" role="group" aria-label={`${label} calendar`}>
            <button type="button" className={mode === 'ad' ? 'on' : ''} onClick={() => switchMode('ad')}>
              AD
            </button>
            <button type="button" className={mode === 'bs' ? 'on' : ''} onClick={() => switchMode('bs')}>
              BS
            </button>
          </span>
        )}
      </span>
      {mode === 'ad' ? (
        <input
          className="input"
          type="date"
          required={required}
          value={value.ad ?? ''}
          onChange={(e) => onChange(e.target.value ? { ad: e.target.value } : {})}
        />
      ) : (
        <input
          className="input"
          inputMode="numeric"
          placeholder="YYYY.MM.DD"
          required={required}
          value={value.bs ?? ''}
          onChange={(e) => {
            const v = toAsciiDigits(e.target.value).replace(/[-/]/g, '.')
            onChange(v ? { bs: v } : {})
          }}
        />
      )}
      {status && (
        <small className={`date-preview${err ? ' err' : ''}`} aria-live="polite">
          {status}
        </small>
      )}
    </div>
  )
}
