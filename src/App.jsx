
import React, { useCallback, useEffect, useState } from 'react'
import { api, excelUrl, getToken, setToken } from './api.js'

const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
const lbl = h => (h > 12 ? h - 12 : h) + ':00 ' + (h >= 12 ? 'PM' : 'AM')
const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const dayName = d => { if (!d) return ''; const dt = new Date(d + 'T00:00:00+05:30'); return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) }
const month = () => today().slice(0, 7)
const COL = { Dear: '#ff3d6a', Kerala: '#19d48a', Punjab: '#ff9a1f', Sikkim: '#3d8bff', 'Goa Queen': '#d24dff' }
const Brand = () => <div className="brand"><span>M</span>Murugan <em>Admin</em></div>

// ================= sign in (password only) =================
function Login({ onIn }) {
    const [pw, setPw] = useState(''), [show, setShow] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('')
    const go = async e => {
      e.preventDefault(); setErr(''); setBusy(true)
      try { const r = await api('admin_login', { password: pw }); setToken(r.token); onIn(r.role) } catch (x) { setErr(x.message); setPw('') }
      setBusy(false)
    }
    return (
      <div className="login">
          <form className="card lcard" onSubmit={go}>
            <Brand />
            <h2>Owner sign in</h2>
            <p>Enter the admin password.</p>
            <div className="pw">
              <input className="in" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
              <button type="button" className="eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? '🙈' : '👁'}</button>
            </div>
            {err && <small className="err">{err}</small>}
            <button className="btn gold" disabled={busy || !pw}>{busy ? 'Please wait…' : 'Sign in'}</button>
          </form>
      </div>
    )
  }

const ago = t => { if (!t) return 'never'; const m = Math.round((Date.now() - new Date(t.replace(' ', 'T') + '+05:30')) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.floor(m / 60) + ' h ago' }
const SITE = { 'www.goaqueen.in': 'goaqueen.in', 'dearlottery.in': 'dearlottery.in', 'www.goodreturns.in': 'goodreturns.in' }

function AutoBar({ auto, reload, toast }) {
  const [busy, setBusy] = useState(false), [rows, setRows] = useState(null)
  const now = async () => {
    setBusy(true)
    try {
      const r = await api('admin_fetch'); setRows(r.rows)
      const n = r.rows.filter(x => x.state === 'new').length
      toast(n ? `${n} new result${n > 1 ? 's' : ''} published from the websites` : 'Checked all websites. Nothing new yet.'); reload()
    } catch (x) { toast(x.message, true) }
    setBusy(false)
  }
  const list = rows || auto?.rows || []
  const stale = auto?.at && (Date.now() - new Date(auto.at.replace(' ', 'T') + '+05:30')) > 15 * 60000
  return (
    <section className="card auto">
      <div className="au-top">
        <div className={'au-live' + (stale || !auto ? ' off' : '')}><i /><b>{stale || !auto ? 'Auto results: not running' : 'Auto results: ON'}</b></div>
        <span className="au-meta">Checks the result websites every 30 sec · last check <b>{ago(rows ? new Date(Date.now() + 330 * 60000).toISOString().slice(0, 19).replace('T', ' ') : auto?.at)}</b></span>
        <button className="btn gold sm" disabled={busy} onClick={now}>{busy ? <><span className="spin" />Checking…</> : '⟳ Fetch now'}</button>
      </div>
      {(stale || !auto) && <p className="au-warn">The 30-second Cron Job has not run recently. Check Cron Jobs in cPanel, or use Fetch now.</p>}
      {list.length > 0 && <div className="au-list">
        {list.map(r => (
          <div key={r.lot + r.h} className={'au-row ' + r.state} style={{ '--c': COL[r.lot] }}>
            <b>{r.lot} · {lbl(+r.h)}</b>
            <span className="au-site">{SITE[r.site] || r.site}</span>
            {r.full ? <span className="au-num"><s>{r.full}</s> → <em>{r.digits}</em></span> : <span className="au-num" />}
            <span className="au-msg">{{ done: '✓ Published', new: '✓ Published now', found: 'Found', wait: 'Not drawn yet', miss: 'Waiting for website', err: '⚠ ' + r.msg }[r.state]}</span>
          </div>
        ))}
      </div>}
    </section>
  )
}

function Results({ lots, results, auto, reload, toast }) {
  const slots = Object.entries(lots || {}).flatMap(([lot, hs]) => hs.map(h => ({ lot, h }))).sort((a, b) => a.h - b.h)
  const [day, setDay] = useState(today()), [pick, setPick] = useState(null), [digits, setDigits] = useState(''), [busy, setBusy] = useState(false)
  const done = (lot, h) => results.find(r => r.day === day && r.lot === lot && +r.h === h)
  const nowH = +new Date(Date.now() + 330 * 60000).toISOString().slice(11, 13)
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
    <>
      <AutoBar auto={auto} reload={reload} toast={toast} />
      <div className="grid2">
        <section className="card">
          <div className="hd"><h3>Today's draws</h3><input type="date" className="in sm" value={day} max={today()} onChange={e => { setDay(e.target.value); setPick(null) }} /></div>
          <div className="slots">
            {slots.map(s => {
              const r = done(s.lot, s.h), late = !r && (day < today() || nowH >= s.h)
              return (
                <button key={s.lot + s.h} disabled={!!r} className={'slot' + (pick && pick.lot === s.lot && pick.h === s.h ? ' on' : '') + (r ? ' done' : late ? ' late' : '')} style={{ '--c': COL[s.lot] || '#9b4dff' }} onClick={() => setPick(s)}>
                  {r && <u className={'tag ' + (r.src === 'auto' ? 'a' : 'm')}>{r.src === 'auto' ? 'AUTO' : 'MANUAL'}</u>}
                  <b>{s.lot}</b><span>{lbl(s.h)}</span>
                  {r ? <em>{r.digits}{r.full_no && <small>{r.full_no}</small>}</em> : <i>{late ? 'Waiting for website…' : 'Upcoming'}</i>}
                </button>
              )
            })}
          </div>
          {pick && (
            <div className="pub">
              <p>Enter by hand: <b>{pick.lot} · {lbl(pick.h)}</b> on {day}</p>
              <div className="digits">
                {[0, 1, 2].map(i => <span key={i} className={digits[i] !== undefined ? 'f' : ''}>{digits[i] ?? ['A', 'B', 'C'][i]}</span>)}
                <input className="hidden-in" inputMode="numeric" maxLength={3} value={digits} onChange={e => setDigits(e.target.value.replace(/\D/g, '').slice(0, 3))} autoFocus aria-label="Result digits" />
              </div>
              <small>Use this only if a website is late or wrong. Publishing pays every ticket straight away and cannot be undone.</small>
              <button className="btn gold" disabled={busy || digits.length !== 3} onClick={publish}>{busy ? 'Publishing…' : 'Publish ' + (digits || '___')}</button>
            </div>
          )}
        </section>
        <section className="card">
          <div className="hd"><h3>Recent results</h3></div>
          {results.length ? <table><thead><tr><th>Date</th><th>Draw</th><th>Website no.</th><th>Result</th><th>By</th></tr></thead><tbody>
            {results.map(r => <tr key={r.day + r.lot + r.h}><td>{r.day}</td><td><i className="dot" style={{ background: COL[r.lot] }} />{r.lot} · {lbl(+r.h)}</td><td className="mono mut">{r.full_no || '—'}</td><td className="mono">{r.digits}</td><td><u className={'tag ' + (r.src === 'auto' ? 'a' : 'm')}>{r.src === 'auto' ? 'Auto' : 'Manual'}</u></td></tr>)}
          </tbody></table> : <div className="empty">No results published yet.</div>}
        </section>
      </div>
    </>
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

  // ================= settings =================
  const Num = ({ v, on, pre = '₹', w }) => <label className="st-num" style={w ? { width: w } : null}>{pre && <span>{pre}</span>}<input type="number" inputMode="numeric" value={v} onChange={e => on(e.target.value === '' ? '' : +e.target.value)} /></label>
  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)   // 6 AM .. 11 PM
  function Settings({ toast }) {
    const [f, setF] = useState(null), [orig, setOrig] = useState(''), [busy, setBusy] = useState(false), [ask, setAsk] = useState(false)
    const load = () => api('config').then(r => {
      const c = r.config, x = { lots: Object.fromEntries(c.lots.map(l => [l.k, l.h])), price: c.price, win: c.win, win_last2: c.last[0], win_last1: c.last[1],
        close_min: Math.round(c.close / 60), approval: c.approval, ref_bonus: c.ref_bonus, upi_id: c.upi.id, upi_name: c.upi.name }
      setF(x); setOrig(JSON.stringify(x))
    }, e => toast(e.message, true))
    useEffect(() => { load() }, [])
    if (!f) return <div className="empty">Loading…</div>
    const set = (k, v) => { setF({ ...f, [k]: v }); setAsk(false) }
    const setArr = (k, i, v) => { const a = [...f[k]]; a[i] = v; set(k, a) }
    const toggleH = (lot, h) => { const hs = f.lots[lot].includes(h) ? f.lots[lot].filter(x => x !== h) : [...f.lots[lot], h].sort((a, b) => a - b); set('lots', { ...f.lots, [lot]: hs }) }
    const changed = JSON.stringify(f) !== orig
    const save = async () => {
      setBusy(true)
      try { await api('admin_settings', { config: f }); toast('Saved. Players see the new settings next time they open the app.'); setAsk(false); await load() } catch (e) { toast(e.message, true) }
      setBusy(false)
    }
    const rows = [['Single', 'one position: A, B or C'], ['Double', 'two positions: AB, AC or BC'], ['Triple', 'all three: ABC']]
    return (
      <section className="rp">
        <div className="rp-head"><div><h2>Settings</h2><p>Ticket prices, prizes, draw times and your UPI. Changes apply to all players.</p></div>
          <div className="row-r">{changed && <span className="mut">Unsaved changes</span>}
            {ask ? <><span className="st-q">Save for all players?</span><button className="btn gold sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Yes, save'}</button><button className="btn ghost sm" onClick={() => setAsk(false)}>Cancel</button></>
              : <><button className="btn ghost sm" disabled={!changed} onClick={() => { setF(JSON.parse(orig)); setAsk(false) }}>Undo</button><button className="btn gold sm" disabled={!changed} onClick={() => setAsk(true)}>Save changes</button></>}</div>
        </div>

        <div className="st-grid">
          <div className="card">
            <h3>Ticket prices and prizes</h3>
            <table className="st-table"><thead><tr><th>Bet</th><th>Ticket price</th><th>Prize if it matches</th><th>Pays</th></tr></thead><tbody>
              {rows.map(([n, d], i) => <tr key={n}><td><b>{n}</b><small>{d}</small></td><td><Num v={f.price[i]} on={v => setArr('price', i, v)} /></td><td><Num v={f.win[i]} on={v => setArr('win', i, v)} /></td><td className="mut">{f.price[i] ? Math.round(f.win[i] / f.price[i]) + '×' : '—'}</td></tr>)}
              <tr><td><b>Triple</b><small>last two digits match</small></td><td className="mut">same ticket</td><td><Num v={f.win_last2} on={v => set('win_last2', v)} /></td><td /></tr>
              <tr><td><b>Triple</b><small>only last digit matches</small></td><td className="mut">same ticket</td><td><Num v={f.win_last1} on={v => set('win_last1', v)} /></td><td /></tr>
            </tbody></table>
          </div>

          <div className="card">
            <h3>Rules</h3>
            <div className="st-field"><div><b>Booking closes</b><small>minutes before each draw</small></div><Num v={f.close_min} on={v => set('close_min', v)} pre="" w={110} /><span className="mut">min</span></div>
            <div className="st-field"><div><b>Owner approval for wins of</b><small>this amount or more wait in Big wins</small></div><Num v={f.approval} on={v => set('approval', v)} w={150} /></div>
            <div className="st-field"><div><b>Referral bonus</b><small>a new player gets this with a friend's code</small></div><Num v={f.ref_bonus} on={v => set('ref_bonus', v)} w={150} /></div>
            <h3 style={{ marginTop: 22 }}>UPI for recharges</h3>
            <div className="st-field"><div><b>UPI ID</b><small>players pay recharges to this</small></div><input className="in" value={f.upi_id} onChange={e => set('upi_id', e.target.value.trim())} placeholder="name@okaxis" /></div>
            <div className="st-field"><div><b>Name shown</b><small>in the player's UPI app</small></div><input className="in" value={f.upi_name} onChange={e => set('upi_name', e.target.value)} /></div>
          </div>
        </div>

        <div className="card">
          <div className="hd"><h3>Draw times</h3><span className="mut">tap an hour to turn it on or off</span></div>
          <div className="st-draws">{Object.keys(f.lots).map(lot => (
            <div key={lot} className="st-lot" style={{ '--c': COL[lot] }}>
              <b>{lot}</b>
              <div className="st-hours">{HOURS.map(h => <button key={h} className={f.lots[lot].includes(h) ? 'on' : ''} onClick={() => toggleH(lot, h)}>{(h > 12 ? h - 12 : h) + (h >= 12 ? 'pm' : 'am')}</button>)}</div>
              <small className="mut">{f.lots[lot].length ? f.lots[lot].map(h => lbl(h)).join(' · ') : 'No draws: add at least one'}</small>
            </div>
          ))}</div>
          <p className="note" style={{ marginTop: 14 }}>If you change draw times, also update the result websites in fetch.php, otherwise new times won't publish automatically.</p>
        </div>
      </section>
    )
  }

  // ================= players =================
  const TX = { recharge: 'Money added', bet: 'Ticket', win: 'Win', bonus: 'Referral bonus', refund: 'Refund', withdraw: 'Withdrawal' }
  function PlayerTxns({ id }) {
    const [t, setT] = useState(null)
    useEffect(() => { api('admin_player', { id }).then(r => setT(r.txns), () => setT([])) }, [id])
    if (!t) return <div className="pl-tx mut">Loading…</div>
    if (!t.length) return <div className="pl-tx mut">No wallet activity yet.</div>
    return <div className="pl-tx"><table className="rp-table"><thead><tr><th>When</th><th>What</th><th>Reference</th><th>Amount</th></tr></thead><tbody>
      {t.map((x, i) => <tr key={i}><td>{x.created_at?.slice(0, 16)}</td><td>{TX[x.type] || x.type}</td><td>{x.ref || '—'}</td><td className={+x.amount >= 0 ? 'pos' : 'neg'}>{+x.amount >= 0 ? '+' : '−'}{inr(Math.abs(x.amount))}</td></tr>)}
    </tbody></table></div>
  }

  function Players({ toast }) {
    const [q, setQ] = useState(''), [d, setD] = useState(null), [page, setPage] = useState(0)
    const [view, setView] = useState(null), [blk, setBlk] = useState(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false)
    const load = (qq = q, pg = page) => api('admin_players', { q: qq, page: pg }).then(setD, x => toast(x.message, true))
    useEffect(() => { const t = setTimeout(() => { setPage(0); load(q, 0) }, 300); return () => clearTimeout(t) }, [q])
    const block = async (x, b) => {
      setBusy(true)
      try { await api('admin_block', { id: x.id, block: b, note: note.trim() }); toast(b ? x.email + ' is blocked and signed out.' : x.email + ' can play again.'); setBlk(null); load() } catch (e) { toast(e.message, true) }
      setBusy(false)
    }
    const go = p => { setPage(p); load(q, p) }
    return (
      <section className="rp">
        <div className="rp-head"><div><h2>Players</h2><p>Everyone who has signed up, with their wallet and money totals.</p></div></div>
        <div className="rp-stats">
          <div><small>Players</small><b>{d ? d.count : '…'}</b><span>signed up</span></div>
          <div><small>New today</small><b>{d ? d.today : '…'}</b><span>joined today</span></div>
          <div><small>Money in wallets</small><b>{d ? inr(d.wallets) : '…'}</b><span>players could withdraw this</span></div>
          <div><small>Blocked</small><b className={d?.blocked ? 'neg' : ''}>{d ? d.blocked : '…'}</b><span>can't sign in</span></div>
        </div>

        <div className="card">
          <div className="hd"><h3>All players</h3><input className="in sm pl-search" type="search" placeholder="Search by email…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search players" /></div>
          {!d ? <div className="empty">Loading…</div> : !d.players.length ? <div className="empty">{q ? 'No player matches "' + q + '".' : 'No players yet.'}</div> :
            <div className="tscroll"><table className="rp-table pl-table"><thead><tr><th>Player</th><th>Wallet</th><th>Added</th><th>Spent</th><th>Won</th><th>Withdrawn</th><th>Last played</th><th></th></tr></thead><tbody>
              {d.players.map(x => <React.Fragment key={x.id}>
                <tr className={+x.blocked ? 'pl-blocked' : ''}>
                  <td><b className="pl-mail">{x.email}</b><small className="pl-sub">{+x.blocked ? <span className="tag m">BLOCKED</span> : null} joined {x.created_at?.slice(0, 10)} · {x.tickets} tickets</small></td>
                  <td>{inr(x.wallet)}</td><td>{inr(x.added)}</td><td>{inr(x.spent)}</td><td>{inr(x.won)}</td><td>{inr(x.taken)}</td>
                  <td>{x.last_play ? x.last_play.slice(0, 10) : '—'}</td>
                  <td className="pl-acts">
                    <button className="btn ghost sm" onClick={() => setView(view === x.id ? null : x.id)}>{view === x.id ? 'Hide' : 'History'}</button>
                    {+x.blocked ? <button className="btn ok sm" disabled={busy} onClick={() => block(x, false)}>Unblock</button>
                      : <button className="btn no sm" onClick={() => { setBlk(x.id); setNote('') }}>Block</button>}
                  </td>
                </tr>
                {blk === x.id && <tr className="pl-row"><td colSpan={8}><div className="wd-form">
                  <input className="in" autoFocus placeholder="Reason, e.g. using many accounts (only you see this)" value={note} onChange={e => setNote(e.target.value)} />
                  <button className="btn no" disabled={busy} onClick={() => block(x, true)}>{busy ? 'Saving…' : 'Block ' + x.email}</button>
                  <button className="btn ghost" onClick={() => setBlk(null)}>Cancel</button></div>
                  <p className="mut" style={{ margin: '8px 0 0' }}>They will be signed out and can't sign in or play. Their wallet money stays as it is.</p></td></tr>}
                {+x.blocked && x.block_note && blk !== x.id ? <tr className="pl-row"><td colSpan={8} className="mut">Blocked because: {x.block_note}</td></tr> : null}
                {view === x.id && <tr className="pl-row"><td colSpan={8}><PlayerTxns id={x.id} /></td></tr>}
              </React.Fragment>)}
            </tbody></table></div>}
          {d && (page > 0 || d.more) && <div className="pl-pages"><button className="btn ghost sm" disabled={!page} onClick={() => go(page - 1)}>‹ Newer</button><span className="mut">Page {page + 1}</span><button className="btn ghost sm" disabled={!d.more} onClick={() => go(page + 1)}>Older ›</button></div>}
        </div>
      </section>
    )
  }

  // ================= withdrawals =================
  function Withdrawals({ ov, reload, toast }) {
    const rows = ov.withdrawals || [], hist = ov.wd_history || []
    const [open, setOpen] = useState(null), [ref, setRef] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false)
    const start = (id, mode) => { setOpen({ id, mode }); setRef(''); setNote('') }
    const save = async x => {
      if (open.mode === 'pay' && ref.trim().length < 6) return toast('Enter the UPI reference number of your payment', true)
      setBusy(true)
      try { await api('admin_withdraw', open.mode === 'pay' ? { id: x.id, paid: true, utr: ref.trim() } : { id: x.id, paid: false, note: note.trim() }); toast(open.mode === 'pay' ? 'Marked as paid.' : 'Rejected. ' + inr(x.amount) + ' returned to the player\'s wallet.'); setOpen(null); reload() } catch (e) { toast(e.message, true) }
      setBusy(false)
    }
    const copy = async t => { try { await navigator.clipboard.writeText(t); toast('Copied ' + t) } catch { toast(t) } }
    const total = rows.reduce((a, x) => a + +x.amount, 0)
    const paid = hist.filter(x => x.status === 'paid')
    return (
      <section className="rp">
        <div className="rp-head"><div><h2>Withdrawals</h2><p>Players asking to take money out. Send it from your UPI app, then mark it as paid here.</p></div></div>
        <div className="rp-stats bw-stats">
          <div><small>To send now</small><b className={rows.length ? 'warn' : ''}>{inr(total)}</b><span>{rows.length} request{rows.length === 1 ? '' : 's'}</span></div>
          <div><small>Paid (last 30)</small><b className="pos">{inr(paid.reduce((a, x) => a + +x.amount, 0))}</b><span>{paid.length} payment{paid.length === 1 ? '' : 's'}</span></div>
          <div><small>Rejected (last 30)</small><b>{hist.filter(x => x.status === 'rejected').length}</b><span>money returned to wallets</span></div>
        </div>

        <div className="card">
          <div className="hd"><h3>Waiting to be paid</h3></div>
          <p className="note">The money has already left the player's wallet. Send it to their UPI ID, then enter your payment's reference number. If you reject, the money goes back to their wallet.</p>
          {rows.length ? <div className="bw-list">{rows.map(x => (
            <div key={x.id} className="bw" style={{ '--c': '#2fa8ff' }}>
              <div className="bw-main">
                <div className="bw-who"><b>{x.email}</b><span>Asked {x.created_at?.slice(0, 16)} · request WD-{x.id}</span></div>
                <div className="bw-res"><small>Send to UPI</small><button className="wd-upi" onClick={() => copy(x.upi)} title="Copy">{x.upi} ⧉</button></div>
                <div className="bw-amt"><small>Amount</small><b>{inr(x.amount)}</b></div>
              </div>
              <div className="bw-lines"><span>Money added <b>{inr(x.added)}</b></span><span>Won <b>{inr(x.won)}</b></span><span>Withdrawn before <b>{inr(x.taken)}</b></span><span>Wallet now <b>{inr(x.wallet)}</b></span></div>
              {open?.id === x.id ? <div className="wd-form">
                {open.mode === 'pay' ? <input className="in" autoFocus placeholder="UPI reference number of your payment (e.g. 431256789012)" value={ref} onChange={e => setRef(e.target.value)} />
                  : <input className="in" autoFocus placeholder="Reason (optional), e.g. Wrong UPI ID" value={note} onChange={e => setNote(e.target.value)} />}
                <button className={'btn ' + (open.mode === 'pay' ? 'ok' : 'no')} disabled={busy} onClick={() => save(x)}>{busy ? 'Saving…' : open.mode === 'pay' ? 'Mark as paid' : 'Reject & refund'}</button>
                <button className="btn ghost" onClick={() => setOpen(null)}>Cancel</button>
              </div> : <div className="bw-acts">
                <button className="btn ok" onClick={() => start(x.id, 'pay')}>I've sent it</button>
                <button className="btn no" onClick={() => start(x.id, 'reject')}>Reject</button>
              </div>}
            </div>
          ))}</div> : <div className="bw-empty"><b>Nothing to pay</b><span>New withdrawal requests from players appear here.</span></div>}
        </div>

        <div className="card">
          <div className="hd"><h3>Recent withdrawals</h3><span className="mut">last 30</span></div>
          {hist.length ? <div className="tscroll"><table className="rp-table"><thead><tr><th>Player</th><th>UPI ID</th><th>Amount</th><th>Status</th><th>Reference / reason</th><th>When</th></tr></thead><tbody>
            {hist.map(x => <tr key={x.id}><td>{x.email}</td><td>{x.upi}</td><td>{inr(x.amount)}</td><td><span className={'tag ' + (x.status === 'paid' ? 'a' : 'm')}>{x.status === 'paid' ? 'Paid' : 'Rejected'}</span></td><td>{x.utr || x.note || '—'}</td><td>{x.decided_at?.slice(0, 16)}</td></tr>)}
          </tbody></table></div> : <div className="empty">No withdrawals yet.</div>}
        </div>
      </section>
    )
  }

  // ================= big wins =================
  const POSN = p => p.length === 1 ? 'Single ' + p : p.length === 2 ? 'Double ' + p : 'Triple'
  function BigWins({ ov, reload, toast }) {
    const rows = ov.big_wins || [], hist = ov.big_history || []
    const mon = Object.fromEntries((ov.big_month || []).map(r => [r.status, r]))
    const [busy, setBusy] = useState(0), [ask, setAsk] = useState(null)
    const act = async (id, approve) => {
      setBusy(id)
      try { await api('admin_bigwin', { id, approve }); toast(approve ? 'Approved. The money is now in the player\'s wallet.' : 'Rejected. The player was not paid.'); setAsk(null); reload() } catch (x) { toast(x.message, true) }
      setBusy(0)
    }
    const waiting = rows.reduce((a, x) => a + +x.amount, 0)
    return (
      <section className="rp">
        <div className="rp-head"><div><h2>Big wins</h2><p>Wins of ₹15,000 or more wait here for your approval before the player is paid.</p></div></div>
        <div className="rp-stats bw-stats">
          <div><small>Waiting for you</small><b className={rows.length ? 'warn' : ''}>{inr(waiting)}</b><span>{rows.length} win{rows.length === 1 ? '' : 's'}</span></div>
          <div><small>Approved this month</small><b className="pos">{inr(mon.approved?.s)}</b><span>{+(mon.approved?.n || 0)} win{+(mon.approved?.n || 0) === 1 ? '' : 's'} paid</span></div>
          <div><small>Rejected this month</small><b>{inr(mon.rejected?.s)}</b><span>{+(mon.rejected?.n || 0)} win{+(mon.rejected?.n || 0) === 1 ? '' : 's'}</span></div>
        </div>

        <div className="card">
          <div className="hd"><h3>Waiting for approval</h3></div>
          {rows.length ? <div className="bw-list">{rows.map(x => (
            <div key={x.id} className="bw" style={{ '--c': COL[x.lot] }}>
              <div className="bw-main">
                <div className="bw-who"><b>{x.email}</b><span>{x.lot} · {lbl(+x.h)} · {dayName(x.day)} · ticket <code>{x.code}</code></span></div>
                <div className="bw-res"><small>Result</small><b>{x.result || '—'}</b></div>
                <div className="bw-amt"><small>To pay</small><b>{inr(x.amount)}</b></div>
              </div>
              {x.lines?.length > 0 && <div className="bw-lines">{x.lines.map((l, i) => <span key={i}>{POSN(l.pos)} <b>{l.v}</b> × {l.q} → {inr(l.win)}</span>)}<span className="mut">Ticket cost {inr(x.total)}</span></div>}
              <div className="bw-acts">
                {ask?.id === x.id ? <>
                  <span className="bw-q">{ask.ok ? `Pay ${inr(x.amount)} to ${x.email}?` : 'Reject this win? The player will not be paid.'}</span>
                  <button className={'btn ' + (ask.ok ? 'ok' : 'no')} disabled={busy === x.id} onClick={() => act(x.id, ask.ok)}>{busy === x.id ? 'Saving…' : ask.ok ? 'Yes, pay' : 'Yes, reject'}</button>
                  <button className="btn ghost" onClick={() => setAsk(null)}>Cancel</button>
                </> : <>
                  <button className="btn ok" onClick={() => setAsk({ id: x.id, ok: true })}>Approve & pay</button>
                  <button className="btn no" onClick={() => setAsk({ id: x.id, ok: false })}>Reject</button>
                </>}
              </div>
            </div>
          ))}</div> : <div className="bw-empty"><b>Nothing waiting</b><span>When a player wins ₹15,000 or more, it shows up here for you to check and approve.</span></div>}
        </div>

        <div className="card">
          <div className="hd"><h3>Recent decisions</h3><span className="mut">last 30</span></div>
          {hist.length ? <div className="tscroll"><table className="rp-table"><thead><tr><th>Player</th><th>Draw</th><th>Ticket</th><th>Amount</th><th>Decision</th><th>When</th></tr></thead><tbody>
            {hist.map(x => <tr key={x.id}><td>{x.email}</td><td><i className="dot" style={{ background: COL[x.lot] }} />{x.lot} · {lbl(+x.h)}</td><td>{x.code}</td><td>{inr(x.amount)}</td>
              <td><span className={'tag ' + (x.status === 'approved' ? 'a' : 'm')}>{x.status === 'approved' ? 'Paid' : 'Rejected'}</span></td><td>{x.decided_at?.slice(0, 16)}</td></tr>)}
          </tbody></table></div> : <div className="empty">No decisions yet.</div>}
        </div>
      </section>
    )
  }

  // sales per lottery and draw time for the month
  function ByDraw({ rows }) {
    const max = Math.max(1, ...rows.map(r => r.sales))
    if (!rows.length) return <div className="empty">No tickets sold this month yet.</div>
    return <div className="tscroll"><table className="rp-table bd"><thead><tr><th>Lottery · draw</th><th className="bd-barh">Sales</th><th>Tickets</th><th>Sales</th><th>Winnings</th><th>Profit</th></tr></thead><tbody>
      {rows.map(r => <tr key={r.lot + r.h}><td><i className="dot" style={{ background: COL[r.lot] }} />{r.lot} · {lbl(r.h)}</td>
        <td className="bd-barh"><span className="bd-bar"><u style={{ width: r.sales / max * 100 + '%', background: COL[r.lot] }} /></span></td>
        <td>{r.tickets}</td><td>{inr(r.sales)}</td><td>{inr(r.winnings)}</td><td className={r.profit >= 0 ? 'pos' : 'neg'}>{inr(r.profit)}</td></tr>)}
    </tbody></table></div>
  }

  // today's open draws: how much is bet, most-bet numbers, and the results that would cost the most
  function Exposure({ toast }) {
    const [d, setD] = useState(null), [busy, setBusy] = useState(false)
    const load = () => { setBusy(true); api('exposure').then(setD, x => toast(x.message, true)).finally(() => setBusy(false)) }
    useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])
    const mins = s => s <= 0 ? 'Booking closed' : s < 3600 ? `Closes in ${Math.ceil(s / 60)} min` : `Closes in ${Math.floor(s / 3600)} h ${Math.ceil(s % 3600 / 60)} min`
    return (
      <div className="card">
        <div className="hd"><h3>Today's open draws: risk check</h3><button className="btn ghost sm" disabled={busy} onClick={load}>{busy ? 'Refreshing…' : '⟳ Refresh'}</button></div>
        <p className="mut" style={{ margin: '-4px 0 14px' }}>For each draw not yet published: money bet so far, the most-bet numbers, and which results would cost the most to pay out.</p>
        {!d ? <div className="empty">Loading…</div> : !d.draws.length ? <div className="empty">All of today's draws are published.</div> :
          <div className="ex-grid">{d.draws.map(x => {
            const worst = x.worst[0]?.payout || 0, net = x.sales - worst
            return (
              <div key={x.lot + x.h} className="ex" style={{ '--c': COL[x.lot] }}>
                <div className="ex-top"><b>{x.lot} · {lbl(x.h)}</b><span>{mins(x.closes_in)}</span></div>
                <div className="ex-nums"><div><small>Bet so far</small><b>{inr(x.sales)}</b><em>{x.tickets} tickets</em></div>
                  <div><small>Worst result costs</small><b className={worst > x.sales ? 'neg' : ''}>{inr(worst)}</b><em className={net >= 0 ? 'pos' : 'neg'}>{x.tickets ? (net >= 0 ? 'still ' + inr(net) + ' profit' : inr(-net) + ' loss') : '—'}</em></div></div>
                {x.tickets ? <>
                  <h4>Costliest results</h4>
                  <div className="ex-risk">{x.worst.map(w => <span key={w.result} className={w.payout > x.sales ? 'hot' : ''}><b>{w.result}</b>{inr(w.payout)}</span>)}</div>
                  <h4>Most-bet numbers</h4>
                  <div className="ex-bets">{x.top_bets.map(b => <span key={b.bet}><b>{b.bet.split(' ')[1]}</b><small>{b.bet.split(' ')[0].length === 1 ? 'Single ' + b.bet[0] : b.bet.split(' ')[0].length === 2 ? 'Double ' + b.bet.split(' ')[0] : 'Triple'}</small>{inr(b.amount)}</span>)}</div>
                </> : <p className="mut">No tickets yet.</p>}
              </div>
            )
          })}</div>}
      </div>
    )
  }

  // ================= analytics =================
  function Analytics({ toast }) {
    const [m, setM] = useState(month()), [d, setD] = useState(null)
    useEffect(() => { setD(null); api('analytics', { month: m }).then(setD, x => toast(x.message, true)) }, [m])
    const t = d?.totals || {}
    const max = Math.max(1, ...(d?.days || []).map(x => Math.max(x.paid, x.winnings)))
    const label = new Date(m + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Exposure toast={toast} />

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
        </section>

        <div className="card">
          <div className="hd"><h3>Sales by lottery and draw</h3><span className="mut">{label}</span></div>
          {d ? <ByDraw rows={d.by_draw || []} /> : <div className="empty">Loading…</div>}
        </div>

        <div className="card">
          <div className="hd"><h3>Day by day</h3><span className="mut">{label}</span></div>
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
        </div>
      </div>
    )
  }

  // ================= shell =================
  export default function App() {
    const [role, setRole] = useState(() => (getToken() ? 'admin' : null))
    const [tab, setTab] = useState('results'), [ov, setOv] = useState(null), [msg, setMsg] = useState(null)
    const toast = (m, bad) => { setMsg({ m, bad }); setTimeout(() => setMsg(null), 4000) }
    const out = () => { api('logout').catch(() => { }); setToken(''); setRole(null) }
    const reload = useCallback(() => {
      if (role !== 'admin') return
      api('admin_overview').then(setOv, x => { if (x.status === 401) setRole(null); else if (x.status === 403) { setRole('analyst'); setTab('analytics') } else toast(x.message, true) })
    }, [role])
    useEffect(() => { reload(); const t = setInterval(reload, 30000); return () => clearInterval(t) }, [reload])
    if (!role) return <Login onIn={r => { setRole(r); setTab(r === 'admin' ? 'results' : 'analytics') }} />

    const tabs = role === 'admin'
      ? [
          ['results', '🎯 Results'],
          ['recharges', '💳 Recharges', ov?.recharges?.length],
          ['wins', '🏆 Big wins', ov?.big_wins?.length],
          ['withdraw', '💸 Withdrawals', ov?.withdrawals?.length],
          ['players', '👥 Players'],
          ['analytics', '📊 Analytics'],
          ['settings', '⚙️ Settings']
        ]
      : [['analytics', '📊 Analytics']]
    return (
      <div className="shell">
        <header className="top">
          <Brand />
          <nav>{tabs.map(([k, l, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{n ? <b>{n}</b> : null}</button>)}</nav>
          <button className="btn ghost sm" onClick={out}>Log out</button>
        </header>
        <main>
          {role === 'admin' && !ov && tab !== 'analytics' && tab !== 'players' && tab !== 'settings' ? <div className="empty">Loading…</div>
            : tab === 'results' ? <Results lots={ov.lots} results={ov.results} auto={ov.auto} reload={reload} toast={toast} />
            : tab === 'recharges' ? <Approvals title="UPI recharges to check" rows={ov.recharges} kind="r" reload={reload} toast={toast} />
            : tab === 'wins' ? <BigWins ov={ov} reload={reload} toast={toast} />
            : tab === 'withdraw' ? <Withdrawals ov={ov} reload={reload} toast={toast} />
            : tab === 'players' ? <Players toast={toast} />
            : tab === 'analytics' ? <Analytics toast={toast} />
            : tab === 'settings' ? <Settings toast={toast} />
            : null}
        </main>
        {msg && <div className={'toast' + (msg.bad ? ' bad' : '')}>{msg.m}</div>}
      </div>
    )
  }
