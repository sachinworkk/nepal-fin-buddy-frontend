// Prefills the visible text inputs of the IRD prize form from values handed off by the app.
// Does not touch the Turnstile check, the bill photo, the bill date picker or the submit button.
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
    if (handoff.bill_date) lines.push(`Pick the bill date yourself: ${handoff.bill_date}`)
    if (handoff.payment_method) lines.push(`Payment method: ${handoff.payment_method}`)
    if (missing.length) lines.push(`Couldn't find: ${missing.join(', ')} — copy it from the app.`)
    lines.push('Then complete the security check and submit.')
    util.showBanner(lines)
  },
})
