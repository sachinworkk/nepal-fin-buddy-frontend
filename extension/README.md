# IRD prize prefill (Chrome / Edge, desktop)

Optional helper for the "Open IRD portal" step. When installed, the portal's text fields
(bill number, PAN, total, name, address, mobile) are filled for you. Without it, use the Copy buttons.

Install: `chrome://extensions` → Developer mode → Load unpacked → select this folder.

How it works: the app opens `https://prize.ird.gov.np/#nfb=<base64url JSON>`. The content script
reads the fragment (never sent to the server), clears it, and fills inputs matched by their `name`
attribute (`bill_number`, `seller_pan_no`, `billed_total_amount`, `name`, `address`, `mobile_number`).

Deliberately not done: the Turnstile check, the bill photo, the submit button, and the bill date
(a custom calendar widget — the banner shows the date to pick). `company_website` is skipped: on the
portal it is a hidden honeypot field.

Mobile browsers (iOS Safari, Android Chrome) don't run Chrome extensions, so mobile keeps using Copy.
