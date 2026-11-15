// Talks to the same PHP backend as the player app.
// Set VITE_API_URL in Vercel (Settings > Environment Variables) to your backend, e.g. https://yourdomain/digitapi/api.php
const URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api.php'
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
