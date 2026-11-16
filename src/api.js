// Talks to the same PHP backend as the player app.
// Set VITE_API_URL in Vercel (Settings > Environment Variables) to your backend, e.g. https://yourdomain/digitapi/api.php
const URL = import.meta.env.VITE_API_URL || 'https://api.fashionsnap.in/api.php'
let token = (() => { try { return localStorage.getItem('l3admin') || '' } catch { return '' } })()
export const setToken = t => { token = t || ''; try { t ? localStorage.setItem('l3admin', t) : localStorage.removeItem('l3admin') } catch { /* private mode */ } }
export const getToken = () => token

export async function api(action, data) {
  const r = await fetch(URL + '?a=' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(data || {}),
  })
  const j = await r.json().catch(() => ({ ok: false, error: 'Server error' }))
  if (r.status === 401) setToken('')
  if (!j.ok) { const e = new Error(j.error || 'Something went wrong'); e.status = r.status; throw e }
  return j
}
export const excelUrl = month => URL + '?a=analytics_excel&month=' + month + '&token=' + encodeURIComponent(token)
export const FETCH_URL = import.meta.env.VITE_FETCH_URL || URL.replace(/api\.php$/, 'fetch.php')
export const FETCH_KEY = import.meta.env.VITE_FETCH_KEY || 'murugan-fetch-2026'

export async function runAutoFetch({ day, test = false, key = FETCH_KEY } = {}) {
  const q = new URLSearchParams()
  if (key) q.set('key', key)
  if (test) q.set('test', '1')
  if (day) q.set('day', day)
  const target = `${FETCH_URL}?${q.toString()}`

  const r = await fetch(target).catch(err => {
    throw new Error(
      `Network / CORS error connecting to fetch.php: ${err.message}. If CORS blocks direct requests from the browser, add "header('Access-Control-Allow-Origin: *');" at the top of fetch.php, or click "Open in Tab".`
    )
  })
  const text = await r.text()
  if (!r.ok) throw new Error(text || `Fetch failed with status ${r.status}`)
  return text
}
