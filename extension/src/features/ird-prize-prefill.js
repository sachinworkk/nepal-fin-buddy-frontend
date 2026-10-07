// Prefills the visible text inputs of the IRD prize form from values handed off by the app.
// Also picks the bill date in the portal's calendar. Does not touch the Turnstile check,
// the bill photo or the submit button.
NFB.register({
  id: 'ird-prize-prefill',
  matches: (url) => url.hostname === 'prize.ird.gov.np',
  async run({ handoff, util }) {
    if (!handoff) return // opened directly, not from the app

    // company_website is deliberately absent: on the portal it is a hidden honeypot field.
    const NAMES = ['bill_number', 'seller_pan_no', 'billed_total_amount', 'name', 'address', 'mobile_number']

    const isVisible = (el) => {
      if (el.tabIndex === -1 || el.readOnly || el.disabled) return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
    }

    await util.waitFor('input[name="bill_number"]')

    // The portal's calendar is AD in English and BS in Nepali; the year options tell us which.
    async function pickBillDate() {
      const trigger = document.querySelector('.nepali-date-trigger')
      if (!trigger) return false
      const popover = () => document.querySelector('.nepali-calendar-popover')
      const close = () => popover() && trigger.click()
      try {
        trigger.click()
        if (!(await util.waitFor('.nepali-calendar-popover', 3000))) return false
        const years = popover().querySelector('select[aria-label="Year"]')
        const isBs = years && Number(years.options[0]?.value) >= 2060
        const raw = isBs ? handoff.bill_date_bs : handoff.bill_date
        const parts = String(raw || '').split(/[-./]/).map(Number)
        if (parts.length !== 3 || parts.some((n) => !n)) return close(), false
        const [y, m, d] = parts

        const yearSel = popover().querySelector('select[aria-label="Year"]')
        if (![...yearSel.options].some((o) => Number(o.value) === y && !o.disabled)) return close(), false
        util.setSelectValue(yearSel, String(y))
        await util.sleep(200)

        const monthSel = popover().querySelector('select[aria-label="Month"]')
        if (![...monthSel.options].some((o) => Number(o.value) === m - 1 && !o.disabled)) return close(), false
        util.setSelectValue(monthSel, String(m - 1))
        await util.sleep(200)

        const day = popover().querySelectorAll('.nepali-calendar-day')[d - 1]
        if (!day || day.disabled) return close(), false
        day.click()
        await util.sleep(200)
        return !popover()
      } catch (e) {
        console.error('[Nepal Fin Buddy] bill date pick failed', e)
        close()
        return false
      }
    }

    const dateDone = handoff.bill_date ? await pickBillDate() : false

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

    const lines = [`Filled ${filled.length} field${filled.length === 1 ? '' : 's'}.`]
    if (dateDone) lines.push(`Bill date set to ${handoff.bill_date}.`)
    else if (handoff.bill_date) lines.push(`Pick the bill date yourself: ${handoff.bill_date}`)
    if (missing.length) lines.push(`Couldn't find: ${missing.join(', ')} — copy it from the app.`)
    lines.push('Then complete the security check and submit.')
    util.showBanner(lines)
  },
})
