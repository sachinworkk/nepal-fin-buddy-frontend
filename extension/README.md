# Nepal Fin Buddy extension (Chrome / Edge, desktop)

Companion extension for the Nepal Fin Buddy web app. Today it has one feature,
**ird-prize-prefill**: when you click "Open IRD portal" in the app, it fills the portal's text fields
(bill number, PAN, total, name, address, mobile). Without it, use the app's Copy buttons.

Install: `chrome://extensions` → Developer mode → Load unpacked → select this folder.
Mobile browsers don't run Chrome extensions, so the app skips the prefill link there.

## Layout

    manifest.json              content-script matches + file order
    src/core.js                NFB registry + helpers (waitFor, setInputValue, showBanner)
    src/features/<id>.js       one file per feature, registers itself with NFB.register
    src/main.js                runs the registered features (keep it last in manifest.json)

## Handing data from the app to a feature

The app opens `<page>#nfb=<base64url JSON>` where the JSON is `{ "feature": "<id>", "data": {...} }`.
The fragment is never sent to a server; core.js reads it once, removes it from the URL, and passes
`data` to the feature whose id matches as `ctx.handoff`.

## Adding a feature

1. Create `src/features/my-feature.js` calling `NFB.register({ id, matches(url), run(ctx) })`.
2. In `manifest.json`, add the file to `js` (before `src/main.js`) and the site to `matches`
   (or add a new `content_scripts` entry for a different site).
3. Features are isolated: an error in one is logged and doesn't stop the others.

Alerts, notifications or anything needing the browser's background APIs will need a service worker
(`background`) plus the matching permissions in the manifest — add them with the feature that needs them.

## ird-prize-prefill: what it deliberately doesn't do

The Turnstile check, the bill photo, the submit button and the bill date (a custom calendar widget —
the banner shows the date to pick). `company_website` is skipped: on the portal it is a hidden honeypot.
