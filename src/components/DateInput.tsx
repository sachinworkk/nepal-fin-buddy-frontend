import { useState } from 'react'
import { toAsciiDigits, useBsConvert } from '../lib/dates'

export interface DateValue {
  ad?: string
  bs?: string
}

type Mode = 'ad' | 'bs'
const KEY = 'dateInputMode'

function loadMode(): Mode {
  try {
    return localStorage.getItem(KEY) === 'bs' ? 'bs' : 'ad'
  } catch {
    return 'ad'
  }
}

function saveMode(m: Mode) {
  try {
    localStorage.setItem(KEY, m)
  } catch {
    /* storage unavailable */
  }
}

interface Props {
  label: string
  value: DateValue
  onChange: (v: DateValue) => void
  bsOnly?: boolean
  required?: boolean
}

/** AD/BS date entry. Emits exactly one of {ad} / {bs} (or {} when empty). */
export default function DateInput({ label, value, onChange, bsOnly, required }: Props) {
  const [pref, setPref] = useState<Mode>(loadMode)
  const mode: Mode = bsOnly ? 'bs' : pref

  const conv = useBsConvert(
    mode === 'ad' ? (value.ad ? { ad: value.ad } : null) : value.bs ? { bs: value.bs } : null,
  )

  function switchMode(next: Mode) {
    if (next === mode) return
    setPref(next)
    saveMode(next)
    // Carry the converted value across when we know it.
    if (next === 'bs') onChange(conv.data ? { bs: conv.data.bs } : {})
    else onChange(conv.data ? { ad: conv.data.ad } : {})
  }

  let preview = ''
  if (conv.data) {
    preview = mode === 'bs' ? `= ${new Date(conv.data.ad + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : `= ${conv.data.bs_label}`
  }
  const err = conv.error instanceof Error ? conv.error.message : ''

  return (
    <div className="snap-field date-input">
      <span className="date-input-head">
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
          placeholder="YYYY.MM.DD  (e.g. २०८२.०६.१९)"
          required={required}
          value={value.bs ?? ''}
          onChange={(e) => {
            const v = toAsciiDigits(e.target.value).replace(/[-/]/g, '.')
            onChange(v ? { bs: v } : {})
          }}
        />
      )}
      <small className={`date-preview${err ? ' err' : ''}`} aria-live="polite">
        {err || preview || (conv.isFetching ? 'Converting…' : ' ')}
      </small>
    </div>
  )
}
