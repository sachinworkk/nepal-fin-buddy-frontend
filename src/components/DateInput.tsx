import { useState } from 'react'
import { adToBs, bsToAd, fmtBsLabel, parseBs, resolveAd } from '../lib/bsCalendar'
import { fmtAd, loadDateMode, saveDateMode, type DateMode } from '../lib/dates'
import BsDatePicker from './BsDatePicker'

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

  function switchMode(next: Mode) {
    if (next === mode) return
    setPref(next)
    saveDateMode(next)
    // Carry the value across; both directions convert locally.
    const ad = resolveAd(value)
    if (next === 'bs') {
      const b = ad ? adToBs(ad) : null
      onChange(b ? { bs: `${b.y}.${String(b.m).padStart(2, '0')}.${String(b.d).padStart(2, '0')}` } : {})
    } else onChange(ad ? { ad } : {})
  }

  let status = ''
  let err = false
  if (mode === 'ad' && value.ad) {
    const b = adToBs(value.ad)
    status = b ? `= ${fmtBsLabel(b)} BS` : 'Outside the supported BS calendar range'
    err = !b
  } else if (mode === 'bs' && value.bs) {
    const b = parseBs(value.bs)
    const ad = b && bsToAd(b)
    if (ad) status = `= ${fmtAd(ad)} (AD)`
    else if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(value.bs)) {
      status = 'Not a valid BS date'
      err = true
    }
  }

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
        <BsDatePicker
          required={required}
          value={value.bs ?? ''}
          onChange={(v) => onChange(v ? { bs: v } : {})}
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
