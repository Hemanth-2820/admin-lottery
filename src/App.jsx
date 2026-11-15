import React, { useCallback, useEffect, useState } from 'react'
import { api, excelUrl, getToken, setToken } from './api.js'

const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
const lbl = h => (h > 12 ? h - 12 : h) + ':00 ' + (h >= 12 ? 'PM' : 'AM')
const today = () => new Date(Date.now() + (new Date().getTimezoneOffset() + 330) * 60000).toISOString().slice(0, 10)
const month = () => today().slice(0, 7)
const COL = { Dear: '#ff3d6a', Kerala: '#19d48a', Punjab: '#ff9a1f', Sikkim: '#3d8bff', 'Goa Queen': '#d24dff' }

// ================= sign in =================
function Login({ onIn }) {
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [dev, setDev] = useState('')
  const send = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { const r = await api('send_otp', { email }); setDev(r.dev_code || ''); setStep(1) } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  const verify = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await api('verify_otp', { email, code })
      if (r.role !== 'admin' && r.role !== 'analyst') { setErr('This email is not an owner or analytics account.'); setBusy(false); return }
      setToken(r.token); onIn(r.role)
    } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  return (
    <div className="login">
      <form className="card lcard" onSubmit={step ? verify : send}>
        <div className="brand"><span>M</span>Murugan <em>Admin</em></div>
        <h2>{step ? 'Enter the code' : 'Owner sign in'}</h2>
        <p>{step ? 'We sent a 6-digit code to ' + email : 'Use the owner or analytics email set in config.php.'}</p>
        {step ? <input className="in code" inputMode="numeric" maxLength={6} placeholder="••••••" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
          : <input className="in" type="email" placeholder="owner@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />}
        {dev && step ? <small className="dev">Test mode code: <b>{dev}</b></small> : null}
        {err && <small className="err">{err}</small>}
        <button className="btn gold" disabled={busy}>{busy ? 'Please wait…' : step ? 'Sign in' : 'Send code'}</button>
        {step ? <button type="button" className="lnk" onClick={() => { setStep(0); setCode('') }}>Use another email</button> : null}
      </form>
    </div>
  )
}

// ================= publish results =================
function Results({ lots, results, reload, toast }) {
  const slots = Object.entries(lots || {}).flatMap(([lot, hs]) => hs.map(h => ({ lot, h }))).sort((a, b) => a.h - b.h)
  const [day, setDay] = useState(today()), [pick, setPick] = useState(null), [digits, setDigits] = useState(''), [busy, setBusy] = useState(false)
  const done = (lot, h) => results.find(r => r.day === day && r.lot === lot && +r.h === h)
  const publish = async () => {
    if (!pick || digits.length !== 3) return
    setBusy(true)
    try {
      const r = await api('admin_publish', { day, lot: pick.lot, h: pick.h, digits })
      toast(`Published ${pick.lot} ${lbl(pick.h)}: ${digits}. ${r.tickets} tickets, ${inr(r.paid)} paid` + (r.held_for_approval ? `, ${inr(r.held_for_approval)} waiting for approval` : ''))
      setPick(null); setDigits(''); reload()
    } catch (x) { toast(x.message, true) }
    setBusy(false)
  }
  return (
    <div className="grid2">
      <section className="card">
        <div className="hd"><h3>Publish a result</h3><input type="date" className="in sm" value={day} max={today()} onChange={e => { setDay(e.target.value); setPick(null) }} /></div>
        <div className="slots">
          {slots.map(s => {
            const r = done(s.lot, s.h)
            return (
              <button key={s.lot + s.h} disabled={!!r} className={'slot' + (pick && pick.lot === s.lot && pick.h === s.h ? ' on' : '') + (r ? ' done' : '')} style={{ '--c': COL[s.lot] || '#9b4dff' }} onClick={() => setPick(s)}>
                <b>{s.lot}</b><span>{lbl(s.h)}</span>{r ? <em>{r.digits}</em> : <i>Pending</i>}
              </button>
            )
          })}
        </div>
        {pick && (
          <div className="pub">
            <p>Result for <b>{pick.lot} · {lbl(pick.h)}</b> on {day}</p>
            <div className="digits">
              {[0, 1, 2].map(i => <span key={i} className={digits[i] !== undefined ? 'f' : ''}>{digits[i] ?? ['A', 'B', 'C'][i]}</span>)}
              <input className="hidden-in" inputMode="numeric" maxLength={3} value={digits} onChange={e => setDigits(e.target.value.replace(/\D/g, '').slice(0, 3))} autoFocus aria-label="Result digits" />
            </div>
            <small>Publishing pays every ticket of this draw straight away. Wins of ₹15,000 or more go to Big wins for your approval. This cannot be undone.</small>
            <button className="btn gold" disabled={busy || digits.length !== 3} onClick={publish}>{busy ? 'Publishing…' : 'Publish ' + (digits || '___')}</button>
          </div>
        )}
      </section>
      <section className="card">
        <div className="hd"><h3>Recent results</h3></div>
        {results.length ? <table><thead><tr><th>Date</th><th>Draw</th><th>Result</th></tr></thead><tbody>
          {results.map(r => <tr key={r.day + r.lot + r.h}><td>{r.day}</td><td><i className="dot" style={{ background: COL[r.lot] }} />{r.lot} · {lbl(+r.h)}</td><td className="mono">{r.digits}</td></tr>)}
        </tbody></table> : <div className="empty">No results published yet.</div>}
      </section>
    </div>
  )
}

// ================= approvals =================
function Approvals({ title, rows, kind, reload, toast }) {
  const [busy, setBusy] = useState(0)
  const act = async (id, approve) => {
    setBusy(id)
    try { await api(kind === 'r' ? 'admin_recharge' : 'admin_bigwin', { id, approve }); toast(approve ? 'Approved. Money added to the wallet.' : 'Rejected.'); reload() } catch (x) { toast(x.message, true) }
    setBusy(0)
  }
  return (
    <section className="card">
      <div className="hd"><h3>{title}</h3><span className="pill">{rows.length} waiting</span></div>
      {kind === 'r' && <p className="note">Check each UTR in your UPI or bank app before approving. Approve only if the money really arrived.</p>}
      {rows.length ? <div className="list">
        {rows.map(x => (
          <div key={x.id} className="row">
            <div className="who"><b>{x.email}</b><small>{kind === 'r' ? 'UTR ' + x.utr : `${x.lot} · ${lbl(+x.h)} · ${x.day} · ${x.code}`} · {x.created_at}</small></div>
            <div className="amt">{inr(x.amount)}</div>
            <div className="acts">
              <button className="btn ok" disabled={busy === x.id} onClick={() => act(x.id, true)}>Approve</button>
              <button className="btn no" disabled={busy === x.id} onClick={() => act(x.id, false)}>Reject</button>
            </div>
          </div>
        ))}
      </div> : <div className="empty">Nothing waiting. 🎉</div>}
    </section>
  )
}

// ================= analytics =================
function Analytics({ toast }) {
  const [m, setM] = useState(month()), [d, setD] = useState(null)
  useEffect(() => { setD(null); api('analytics', { month: m }).then(setD, x => toast(x.message, true)) }, [m])
  const t = d?.totals || {}
  const max = Math.max(1, ...(d?.days || []).map(x => Math.max(x.paid, x.winnings)))
  return (
    <section className="card">
      <div className="hd"><h3>Monthly analytics</h3>
        <div className="row-r"><input type="month" className="in sm" value={m} max={month()} onChange={e => setM(e.target.value)} />
          <a className="btn gold sm" href={excelUrl(m)}>⬇ Download Excel</a></div>
      </div>
      <div className="kpis">
        <div className="kpi"><small>Amount paid by players</small><b>{inr(t.paid)}</b><em>{t.tickets || 0} tickets</em></div>
        <div className="kpi"><small>Winnings paid</small><b>{inr(t.winnings)}</b></div>
        <div className="kpi"><small>Referral bonus</small><b>{inr(t.bonus)}</b></div>
        <div className={'kpi ' + ((t.profit || 0) >= 0 ? 'pos' : 'neg')}><small>Profit</small><b>{inr(t.profit)}</b><em>paid − winnings − bonus</em></div>
        <div className="kpi"><small>UPI recharges</small><b>{inr(t.recharges)}</b></div>
      </div>
      {d ? <>
        <div className="bars" role="img" aria-label="Daily amount paid and winnings">
          {d.days.map(x => <div key={x.day} className="bar" title={`${x.day}: paid ${inr(x.paid)}, winnings ${inr(x.winnings)}`}>
            <i style={{ height: x.paid / max * 100 + '%' }} /><i className="w" style={{ height: x.winnings / max * 100 + '%' }} /><span>{+x.day.slice(8)}</span>
          </div>)}
        </div>
        <div className="legend"><span><i />Paid by players</span><span><i className="w" />Winnings</span></div>
        <div className="tscroll"><table><thead><tr><th>Date</th><th>Tickets</th><th>Paid</th><th>Winnings</th><th>Bonus</th><th>Profit</th><th>Recharges</th></tr></thead><tbody>
          {d.days.filter(x => x.tickets || x.winnings || x.recharges || x.bonus).map(x => <tr key={x.day}><td>{x.day}</td><td>{x.tickets}</td><td>{inr(x.paid)}</td><td>{inr(x.winnings)}</td><td>{inr(x.bonus)}</td><td className={x.profit >= 0 ? 'pos' : 'neg'}>{inr(x.profit)}</td><td>{inr(x.recharges)}</td></tr>)}
        </tbody></table></div>
      </> : <div className="empty">Loading…</div>}
    </section>
  )
}

// ================= shell =================
export default function App() {
  const [role, setRole] = useState(() => (getToken() ? 'admin' : null))
  const [tab, setTab] = useState('results'), [ov, setOv] = useState(null), [msg, setMsg] = useState(null)
  const toast = (m, bad) => { setMsg({ m, bad }); setTimeout(() => setMsg(null), 4000) }
  const out = () => { api('logout').catch(() => {}); setToken(''); setRole(null) }
  const reload = useCallback(() => {
    if (role !== 'admin') return
    api('admin_overview').then(setOv, x => { if (x.status === 401) setRole(null); else if (x.status === 403) { setRole('analyst'); setTab('analytics') } else toast(x.message, true) })
  }, [role])
  useEffect(() => { reload(); const t = setInterval(reload, 30000); return () => clearInterval(t) }, [reload])
  if (!role) return <Login onIn={r => { setRole(r); setTab(r === 'admin' ? 'results' : 'analytics') }} />

  const tabs = role === 'admin'
    ? [['results', '🎯 Results'], ['recharges', '💳 Recharges', ov?.recharges.length], ['wins', '🏆 Big wins', ov?.big_wins.length], ['analytics', '📊 Analytics']]
    : [['analytics', '📊 Analytics']]
  return (
    <div className="shell">
      <header className="top">
        <div className="brand"><span>M</span>Murugan <em>Admin</em></div>
        <nav>{tabs.map(([k, l, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{n ? <b>{n}</b> : null}</button>)}</nav>
        <button className="btn ghost sm" onClick={out}>Log out</button>
      </header>
      <main>
        {role === 'admin' && !ov && tab !== 'analytics' ? <div className="empty">Loading…</div>
          : tab === 'results' ? <Results lots={ov.lots} results={ov.results} reload={reload} toast={toast} />
          : tab === 'recharges' ? <Approvals title="UPI recharges to check" rows={ov.recharges} kind="r" reload={reload} toast={toast} />
          : tab === 'wins' ? <Approvals title="Wins of ₹15,000 or more" rows={ov.big_wins} kind="w" reload={reload} toast={toast} />
          : <Analytics toast={toast} />}
      </main>
      {msg && <div className={'toast' + (msg.bad ? ' bad' : '')}>{msg.m}</div>}
    </div>
  )
}
