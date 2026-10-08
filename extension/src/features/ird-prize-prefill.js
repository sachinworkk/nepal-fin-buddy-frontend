// Prefills the visible text inputs of the IRD prize form from values handed off by the app.
// Picks the bill date in the portal's calendar (English/AD only). Does not touch the Turnstile check,
// the bill photo or the submit button.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// "23 Sep 2026" from "2026-09-23" — same format as the app's fmtAd.
const fmtAd = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1].slice(0, 3)} ${m[1]}` : iso
}

// Drives the portal's calendar popover: year select, month select, then the day button (aria-label
// "October 1, 2026"). Returns false when the date isn't selectable (e.g. year not offered).
async function pickBillDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return false
  const [y, mo, d] = [+m[1], +m[2], +m[3]]
  const trigger = document.querySelector('.nepali-date-trigger')
  if (!trigger) return false
  if (!document.querySelector('.nepali-calendar-popover')) {
    trigger.click()
    await sleep(300)
  }
  const pop = document.querySelector('.nepali-calendar-popover')
  if (!pop) return false
  const setSelect = (sel, value) => {
    const opt = [...sel.options].find((o) => o.value === String(value) && !o.disabled)
    if (!opt) return false
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, String(value))
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }
  const yearSel = pop.querySelector('select[aria-label="Year"]')
  const monthSel = pop.querySelector('select[aria-label="Month"]')
  const ok = yearSel && monthSel && setSelect(yearSel, y) && (await sleep(200), setSelect(monthSel, mo - 1))
  if (ok) await sleep(200)
  const day = ok && document.querySelector(`.nepali-calendar-day[aria-label="${MONTHS[mo - 1]} ${d}, ${y}"]`)
  if (!day) {
    trigger.click() // close the popover; leave the date for the user
    return false
  }
  day.click()
  await sleep(300)
  return true
}

NFB.register({
  id: 'ird-prize-prefill',
  matches: (url) => url.hostname === 'prize.ird.gov.np',
  async run({ handoff, util }) {
    if (!handoff) return // opened directly, not from the app

    // company_website is deliberately absent: on the portal it is a hidden honeypot field.
    const NAMES = ['bill_number', 'seller_pan_no', 'billed_total_amount', 'name', 'address', 'mobile_number']
    const LABELS = {
      bill_number: 'bill number',
      seller_pan_no: 'seller PAN',
      billed_total_amount: 'total amount',
      name: 'name',
      address: 'address',
      mobile_number: 'mobile number',
    }

    const isVisible = (el) => {
      if (el.tabIndex === -1 || el.readOnly || el.disabled) return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
    }

    await util.waitFor('input[name="bill_number"]')

    const datePicked = await pickBillDate(handoff.bill_date)

    const filled = []
    const missing = []
    for (const name of NAMES) {
      const value = handoff[name]
      if (!value) continue
      const el = [...document.querySelectorAll(`input[name="${name}"], textarea[name="${name}"]`)].find(isVisible)
      if (el) {
        util.setInputValue(el, String(value))
        filled.push(name)
      } else missing.push(name)
    }

    const lines = [`Filled ${filled.length} field${filled.length === 1 ? '' : 's'} with your bill details.`]
    if (datePicked) lines.push(`Bill date is set to ${fmtAd(handoff.bill_date)} (AD) — please give it a quick double-check.`)
    else if (handoff.bill_date)
      lines.push(`Couldn't set the bill date automatically — please pick ${fmtAd(handoff.bill_date)} in the calendar (English/AD only).`)
    if (handoff.payment_method)
      lines.push(`Payment method isn't filled in — remember to select "${handoff.payment_method}".`)
    if (missing.length) {
      const names = missing.map((n) => LABELS[n] ?? n).join(', ')
      lines.push(`Couldn't find: ${names} — please copy ${missing.length === 1 ? 'it' : 'those'} from the app.`)
    }
    lines.push('Finally, complete the security check and submit.')
    util.showBanner(lines)
  },
})
