import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Buffer } from 'buffer'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

type Remittance = {
  id: string
  createdAtMs: number
  amount: string
  asset: 'USDC' | 'SOL'
  paymentSource: 'FIAT' | 'SOLANA_WALLET'
  payoutCurrency: string
  payoutMethod: 'STABLECOIN' | 'MOBILE_MONEY' | 'BANK'
  recipientHint?: string
  escrowPda?: string
  status: 'CREATED' | 'CLAIMED' | 'CANCELLED'
  claimedAtMs?: number
  cancelledAtMs?: number
  fx?: { pair: string; rate: number; provider: 'PYTH_MOCK' | 'PYTH_LIVE'; asOfMs: number }
}

type RecurringSchedule = {
  id: string
  recipientHint: string
  amount: string
  asset: 'USDC' | 'SOL'
  payoutCurrency: string
  payoutMethod: 'STABLECOIN' | 'MOBILE_MONEY' | 'BANK'
  intervalDays: number
  nextRunMs: number
  createdAtMs: number
  active: boolean
}

const PROGRAM_ID = new PublicKey('2AeboQZoaSyBoC2YRcVHvL9CYh5embbddQ6pFubCKdoZ')
const EXPLORER_CLUSTER = 'devnet'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error ? JSON.stringify(json.error) : `HTTP ${res.status}`)
  return json as T
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return new Uint8Array(digest)
}

async function createEscrowInstructionData(
  escrowId: Uint8Array,
  claimHash: Uint8Array,
  amountLamports: number,
) {
  const discriminatorFull = await sha256(new TextEncoder().encode('global:create_escrow'))
  const discriminator = discriminatorFull.slice(0, 8)
  const data = new Uint8Array(8 + 16 + 32 + 8)
  data.set(discriminator, 0)
  data.set(escrowId, 8)
  data.set(claimHash, 24)
  const view = new DataView(data.buffer)
  view.setBigUint64(56, BigInt(amountLamports), true)
  return data
}

function parseAmountLamports(value: string) {
  const amountNumber = Number(value)
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw new Error('Amount must be a positive number')
  }
  return Math.round(amountNumber * LAMPORTS_PER_SOL)
}

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try {
    return JSON.stringify(e)
  } catch {
    return 'Unknown error'
  }
}

function statusLabel(status: Remittance['status']) {
  switch (status) {
    case 'CREATED':
      return '🔒 Locked on Solana'
    case 'CLAIMED':
      return '✅ Completed'
    case 'CANCELLED':
      return '↩ Refunded'
    default:
      return status
  }
}

function maskRecipientHint(hint?: string) {
  const v = (hint ?? '').trim()
  if (!v) return '—'
  if (v.length <= 6) return `${v.slice(0, 2)}…`
  return `${v.slice(0, 2)}…${v.slice(-2)}`
}

function App() {
  const location = useLocation()
  const { connection } = useConnection()
  const wallet = useWallet()
  const { setVisible } = useWalletModal()

  const initialClaimToken =
    typeof window !== 'undefined' && window.location.hash.startsWith('#')
      ? window.location.hash.slice(1).trim()
      : ''

  const [tab, setTab] = useState<'send' | 'receive' | 'recurring'>(() =>
    initialClaimToken ? 'receive' : 'send',
  )

  // Sender form
  const [amount, setAmount] = useState('25')
  const [asset, setAsset] = useState<'USDC' | 'SOL'>('USDC')
  const [payoutCurrency, setPayoutCurrency] = useState('NPR')
  const [payoutMethod, setPayoutMethod] = useState<'MOBILE_MONEY' | 'STABLECOIN' | 'BANK'>(
    'MOBILE_MONEY',
  )
  const [paymentSource, setPaymentSource] = useState<'FIAT' | 'SOLANA_WALLET'>('FIAT')
  const [recipientHint, setRecipientHint] = useState('98XXXXXXXX')
  const [created, setCreated] = useState<{ remittance: Remittance; claimUrl: string } | null>(null)
  const [txExplorerUrl, setTxExplorerUrl] = useState<string | null>(null)
  const [senderError, setSenderError] = useState<string | null>(null)
  const [loadingSend, setLoadingSend] = useState(false)
  const [receiverNotified, setReceiverNotified] = useState(false)
  const [claimedTotalSent, setClaimedTotalSent] = useState(0)

  // Recurring schedules
  const [repeatEvery, setRepeatEvery] = useState<'7' | '14' | '30'>('7')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])

  // Receiver claim
  const [claimToken, setClaimToken] = useState(() => initialClaimToken)
  const [claimed, setClaimed] = useState<{ remittance: Remittance; next: string; nftTx: string | null } | null>(
    null,
  )
  const [receiverError, setReceiverError] = useState<string | null>(null)
  const [loadingClaim, setLoadingClaim] = useState(false)

  const shortWallet = wallet.publicKey
    ? `${wallet.publicKey.toBase58().slice(0, 4)}...${wallet.publicKey.toBase58().slice(-4)}`
    : null

  const amountNumber = Number(amount)
  const usdcAmount = Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber : 0
  const chainRemitNpr = Math.round(usdcAmount * 132)
  const westernUnionNpr = Math.round(usdcAmount * 123)
  const youSaveNpr = Math.max(0, chainRemitNpr - westernUnionNpr)
  const nprFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
  const amountFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

  useEffect(() => {
    let cancelled = false
    async function refreshSavings() {
      try {
        const out = await api<{ remittances: Remittance[] }>('/api/remittances')
        if (cancelled) return
        const total = out.remittances.reduce((sum, r) => {
          if (r.status !== 'CLAIMED') return sum
          const n = Number(r.amount)
          return sum + (Number.isFinite(n) ? n : 0)
        }, 0)
        setClaimedTotalSent(total)
      } catch {
        // ignore for demo
      }
    }
    void refreshSavings()
    return () => {
      cancelled = true
    }
  }, [created])

  useEffect(() => {
    if (!created?.remittance?.id) return
    setReceiverNotified(false)
    const t = window.setTimeout(() => setReceiverNotified(true), 4000)
    return () => window.clearTimeout(t)
  }, [created?.remittance?.id])

  useEffect(() => {
    const id = created?.remittance?.id
    if (!id) return

    let cancelled = false
    const poll = async () => {
      try {
        const out = await api<{ remittance: Remittance }>(`/api/remittances/${id}`)
        if (cancelled) return
        setCreated((prev) => (prev ? { ...prev, remittance: out.remittance } : prev))
        if (out.remittance.status === 'CLAIMED' || out.remittance.status === 'CANCELLED') {
          window.clearInterval(interval)
        }
      } catch {
        // ignore polling errors in demo
      }
    }

    const interval = window.setInterval(() => void poll(), 3000)
    void poll()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [created?.remittance?.id])

  async function refreshSchedules() {
    try {
      const out = await api<{ schedules: RecurringSchedule[] }>('/api/recurring')
      setSchedules(out.schedules)
    } catch {
      // ignore for demo
    }
  }

  useEffect(() => {
    void refreshSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agentUi = useMemo(() => {
    return function AgentPage() {
      const [pin, setPin] = useState('')
      const [authed, setAuthed] = useState(false)
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState<string | null>(null)
      const [remittances, setRemittances] = useState<Remittance[]>([])
      const [releasingId, setReleasingId] = useState<string | null>(null)

      async function refresh() {
        setError(null)
        setLoading(true)
        try {
          const out = await api<{ remittances: Remittance[] }>('/api/agent/remittances')
          setRemittances(out.remittances)
        } catch (e: unknown) {
          setError(getErrorMessage(e) || 'Failed to fetch remittances')
        } finally {
          setLoading(false)
        }
      }

      useEffect(() => {
        let cancelled = false
        async function checkSession() {
          try {
            const out = await api<{ authenticated: boolean }>('/api/auth/session')
            if (cancelled) return
            setAuthed(out.authenticated)
            if (out.authenticated) {
              void refresh()
            }
          } catch {
            if (cancelled) return
            setAuthed(false)
          }
        }
        void checkSession()
        return () => {
          cancelled = true
        }
      }, [])

      useEffect(() => {
        if (!authed) return
        void refresh()
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [authed])

      return (
        <div className="page">
          <header className="top">
            <div className="brand">
              <div className="logoMark" aria-hidden="true" />
              <div className="brandText">
                <div className="brandName">ChainRemit</div>
                <div className="brandTag">Agent console (demo PIN-gated)</div>
              </div>
            </div>
            <nav className="tabs" aria-label="Primary">
              <Link className="tab active" to="/agent">
                Agent
              </Link>
              <Link className="tab" to="/">
                Back to app
              </Link>
            </nav>
            <button
              type="button"
              className="primary"
              onClick={async () => {
                if (wallet.connected) {
                  await wallet.disconnect()
                  return
                }
                setVisible(true)
              }}
            >
              {wallet.connected ? `Disconnect ${shortWallet}` : 'Connect Phantom'}
            </button>
          </header>

          <main className="main">
            {!authed ? (
              <section className="card">
                <h1>Enter agent PIN</h1>
                <p className="muted">PIN is verified by the relayer with rate limits and cookie session.</p>
                <label className="field full">
                  <span>PIN</span>
                  <input
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>
                <div className="actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={async () => {
                      setError(null)
                      try {
                        await api<{ ok: boolean }>('/api/auth/login', {
                          method: 'POST',
                          body: JSON.stringify({ pin }),
                        })
                        setAuthed(true)
                        setPin('')
                      } catch (e: unknown) {
                        setError(getErrorMessage(e) || 'Invalid PIN')
                      }
                    }}
                  >
                    Unlock
                  </button>
                </div>
                {error ? <div className="alert">{error}</div> : null}
              </section>
            ) : (
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <h1 style={{ margin: 0 }}>Created remittances</h1>
                  <div className="actions" style={{ margin: 0 }}>
                    <button type="button" className="ghost" disabled={loading} onClick={() => void refresh()}>
                      {loading ? 'Refreshing…' : 'Refresh'}
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={async () => {
                        setAuthed(false)
                        setPin('')
                        setRemittances([])
                        await api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).catch(() => {})
                      }}
                    >
                      Lock
                    </button>
                  </div>
                </div>

                {error ? <div className="alert">{error}</div> : null}

                {remittances.length === 0 ? (
                  <p className="muted" style={{ marginTop: 12 }}>
                    No remittances in CREATED state.
                  </p>
                ) : (
                  <div className="result" style={{ marginTop: 12 }}>
                    {remittances.map((r) => (
                      <div className="row" key={r.id} style={{ alignItems: 'center' }}>
                        <span className="k" style={{ minWidth: 120 }}>
                          {r.amount} {r.asset}
                        </span>
                        <span className="v">{maskRecipientHint(r.recipientHint)}</span>
                        <span className="v" style={{ marginLeft: 'auto' }}>
                          <button
                            type="button"
                            className="primary"
                            disabled={releasingId === r.id}
                            onClick={async () => {
                              setError(null)
                              setReleasingId(r.id)
                              try {
                                const out = await api<{ remittance: Remittance }>(
                                  `/api/remittances/${r.id}/agent-release`,
                                  { method: 'POST' },
                                )
                                setRemittances((prev) =>
                                  prev
                                    .map((x) => (x.id === r.id ? out.remittance : x))
                                    .filter((x) => x.status === 'CREATED'),
                                )
                              } catch (e: unknown) {
                                const message = getErrorMessage(e) || 'Release failed'
                                setError(message)
                                if (message.includes('unauthorized') || message.includes('session_expired')) {
                                  setAuthed(false)
                                }
                              } finally {
                                setReleasingId(null)
                              }
                            }}
                          >
                            {releasingId === r.id ? 'Releasing…' : 'Release Cash'}
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <aside className="side card">
              <h2>How this demo works</h2>
              <ol className="list">
                <li>Sender creates remittance</li>
                <li>Agent sees it in CREATED</li>
                <li>Agent releases cash and marks CLAIMED</li>
              </ol>
              <div className="hr" />
              <div className="muted small">Use AGENT_PIN or AGENT_PIN_HASH/AGENT_PIN_SALT in relayer env.</div>
            </aside>
          </main>
        </div>
      )
    }
  }, [setVisible, shortWallet, wallet.connected])

  function HistoryPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [remittances, setRemittances] = useState<Remittance[]>([])

    useEffect(() => {
      let cancelled = false
      async function run() {
        setError(null)
        setLoading(true)
        try {
          const out = await api<{ remittances: Remittance[] }>('/api/remittances')
          if (cancelled) return
          setRemittances(out.remittances)
        } catch (e: unknown) {
          if (cancelled) return
          setError(getErrorMessage(e) || 'Failed to fetch remittances')
        } finally {
          if (cancelled) return
          setLoading(false)
        }
      }
      void run()
      return () => {
        cancelled = true
      }
    }, [])

    const rows = [...remittances].sort((a, b) => b.createdAtMs - a.createdAtMs)

    return (
      <div className="page">
        <header className="top">
          <div className="brand">
            <div className="logoMark" aria-hidden="true" />
            <div className="brandText">
              <div className="brandName">ChainRemit</div>
              <div className="brandTag">Remittance history</div>
            </div>
          </div>
          <nav className="tabs" aria-label="Primary">
            <Link className="tab" to="/">
              Back
            </Link>
            <Link className="tab active" to="/history">
              History
            </Link>
            <Link className="tab" to="/agent">
              Agent
            </Link>
          </nav>
          <button
            type="button"
            className="primary"
            onClick={async () => {
              if (wallet.connected) {
                await wallet.disconnect()
                return
              }
              setVisible(true)
            }}
          >
            {wallet.connected ? `Disconnect ${shortWallet}` : 'Connect Phantom'}
          </button>
        </header>

        <main className="main">
          <section className="card" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <h1 style={{ margin: 0 }}>All remittances</h1>
              <div className="actions" style={{ margin: 0 }}>
                <button
                  type="button"
                  className="ghost"
                  disabled={loading}
                  onClick={async () => {
                    setError(null)
                    setLoading(true)
                    try {
                      const out = await api<{ remittances: Remittance[] }>('/api/remittances')
                      setRemittances(out.remittances)
                    } catch (e: unknown) {
                      setError(getErrorMessage(e) || 'Failed to fetch remittances')
                    } finally {
                      setLoading(false)
                    }
                  }}
                >
                  {loading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>

            {error ? <div className="alert">{error}</div> : null}

            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }} scope="col">
                      Time
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }} scope="col">
                      Amount
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }} scope="col">
                      Asset
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }} scope="col">
                      Recipient
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }} scope="col">
                      Status
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }} scope="col">
                      Explorer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted" style={{ padding: '12px 8px' }}>
                        {loading ? 'Loading…' : 'No remittances yet.'}
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const time = new Date(r.createdAtMs).toLocaleString()
                      const explorerUrl = r.escrowPda
                        ? `https://explorer.solana.com/address/${r.escrowPda}?cluster=${EXPLORER_CLUSTER}`
                        : null
                      return (
                        <tr key={r.id}>
                          <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>{time}</td>
                          <td style={{ padding: '10px 8px' }}>{r.amount}</td>
                          <td style={{ padding: '10px 8px' }}>{r.asset}</td>
                          <td style={{ padding: '10px 8px' }}>{maskRecipientHint(r.recipientHint)}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span className="pill">{statusLabel(r.status)}</span>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            {explorerUrl ? (
                              <a href={explorerUrl} target="_blank" rel="noreferrer">
                                View
                              </a>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/agent" element={agentUi()} />
      <Route path="/history" element={<HistoryPage />} />
      <Route
        path="*"
        element={
          <div className="page">
      <header className="top">
        <div className="brand">
          <div className="logoMark" aria-hidden="true" />
          <div className="brandText">
            <div className="brandName">ChainRemit</div>
            <div className="brandTag">
              Cutting remittance fees from 7% → under 1% · Built in Biratnagar, Nepal
            </div>
          </div>
        </div>
        <nav className="tabs" aria-label="Primary">
          <button
            type="button"
            className={tab === 'send' ? 'tab active' : 'tab'}
            onClick={() => setTab('send')}
          >
            Sender
          </button>
          <button
            type="button"
            className={tab === 'receive' ? 'tab active' : 'tab'}
            onClick={() => setTab('receive')}
          >
            Receiver
          </button>
          <button
            type="button"
            className={tab === 'recurring' ? 'tab active' : 'tab'}
            onClick={() => setTab('recurring')}
          >
            Recurring
          </button>
          <Link className={location.pathname === '/history' ? 'tab active' : 'tab'} to="/history">
            History
          </Link>
        </nav>
        <button
          type="button"
          className="primary"
          onClick={async () => {
            if (wallet.connected) {
              await wallet.disconnect()
              return
            }
            setVisible(true)
          }}
        >
          {wallet.connected ? `Disconnect ${shortWallet}` : 'Connect Phantom'}
        </button>
      </header>

      <main className="main">
        <aside className="side card" style={{ display: 'none' }} />
        {tab === 'send' ? (
          <section className="card">
            <h1>Send remittance</h1>
            <p className="muted">
              Default is walletless sender flow for mainstream users. Crypto wallet funding is optional.
            </p>

            <div className="grid">
              <label className="field full">
                <span>How sender pays</span>
                <select
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value as 'FIAT' | 'SOLANA_WALLET')}
                >
                  <option value="FIAT">Fiat transfer (default)</option>
                  <option value="SOLANA_WALLET">Solana wallet (optional)</option>
                </select>
              </label>

              <label className="field">
                <span>Amount</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </label>
              {asset === 'USDC' ? (
                <div className="field full muted small" style={{ marginTop: -8 }}>
                  ChainRemit: NPR {nprFmt.format(chainRemitNpr)} | Western Union: ~NPR{' '}
                  {nprFmt.format(westernUnionNpr)} | You save: NPR {nprFmt.format(youSaveNpr)}
                </div>
              ) : null}

              <label className="field">
                <span>Asset</span>
                <select value={asset} onChange={(e) => setAsset(e.target.value as 'USDC' | 'SOL')}>
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                </select>
              </label>

              <label className="field">
                <span>Payout currency</span>
                <input value={payoutCurrency} onChange={(e) => setPayoutCurrency(e.target.value)} />
              </label>

              <label className="field">
                <span>Payout method</span>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as 'MOBILE_MONEY' | 'STABLECOIN' | 'BANK')}
                >
                  <option value="MOBILE_MONEY">Mobile money (eSewa/Khalti)</option>
                  <option value="BANK">Bank transfer</option>
                  <option value="STABLECOIN">Stablecoin (recipient wallet)</option>
                </select>
              </label>

              <label className="field full">
                <span>Recipient hint (phone / handle)</span>
                <input value={recipientHint} onChange={(e) => setRecipientHint(e.target.value)} />
              </label>
            </div>

            <div className="actions">
              <button
                type="button"
                className="primary"
                disabled={loadingSend}
                onClick={async () => {
                  setSenderError(null)
                  setCreated(null)
                  setTxExplorerUrl(null)
                  setLoadingSend(true)
                  try {
                    if (paymentSource === 'FIAT') {
                      const out = await api<{ remittance: Remittance; claimUrl: string }>('/api/remittances', {
                        method: 'POST',
                        body: JSON.stringify({
                          amount,
                          asset,
                          paymentSource: 'FIAT',
                          payoutCurrency,
                          payoutMethod,
                          recipientHint,
                        }),
                      })
                      setCreated(out)
                      setTxExplorerUrl(null)
                    } else {
                      if (!wallet.connected) {
                        setVisible(true)
                        return
                      }
                      if (!wallet.publicKey) {
                        throw new Error('Connect Phantom wallet first')
                      }
                      if (!wallet.sendTransaction) {
                        throw new Error('Wallet does not support sending transactions')
                      }

                      const escrowId = crypto.getRandomValues(new Uint8Array(16))
                      const claimTokenBytes = crypto.getRandomValues(new Uint8Array(32))
                      const claimToken = toBase64Url(claimTokenBytes)
                      const claimHash = await sha256(claimTokenBytes)
                      const amountLamports = parseAmountLamports(amount)

                      const [escrowPda] = PublicKey.findProgramAddressSync(
                        [new TextEncoder().encode('escrow'), wallet.publicKey.toBytes(), escrowId],
                        PROGRAM_ID,
                      )
                      const instructionData = await createEscrowInstructionData(
                        escrowId,
                        claimHash,
                        amountLamports,
                      )
                      const instruction = new TransactionInstruction({
                        programId: PROGRAM_ID,
                        keys: [
                          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                          { pubkey: escrowPda, isSigner: false, isWritable: true },
                          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                        ],
                        data: Buffer.from(instructionData),
                      })
                      const tx = new Transaction().add(instruction)
                      tx.feePayer = wallet.publicKey
                      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
                      tx.recentBlockhash = latestBlockhash.blockhash
                      const signature = await wallet.sendTransaction(tx, connection, {
                        preflightCommitment: 'confirmed',
                      })
                      await connection.confirmTransaction(
                        {
                          signature,
                          blockhash: latestBlockhash.blockhash,
                          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                        },
                        'confirmed',
                      )

                      const out = await api<{ remittance: Remittance; claimUrl: string }>('/api/remittances', {
                        method: 'POST',
                        body: JSON.stringify({
                          amount,
                          asset,
                          paymentSource: 'SOLANA_WALLET',
                          payoutCurrency,
                          payoutMethod,
                          recipientHint,
                          senderPubkey: wallet.publicKey.toBase58(),
                          escrowPda: escrowPda.toBase58(),
                          claimToken,
                        }),
                      })
                      setCreated(out)
                      setTxExplorerUrl(`https://explorer.solana.com/tx/${signature}?cluster=${EXPLORER_CLUSTER}`)
                    }
                  } catch (e: unknown) {
                    setSenderError(getErrorMessage(e) || 'Failed to create remittance')
                  } finally {
                    setLoadingSend(false)
                  }
                }}
              >
                {loadingSend
                  ? 'Creating…'
                  : paymentSource === 'FIAT'
                    ? 'Create remittance (fiat)'
                    : 'Create remittance (wallet)'}
              </button>
              {paymentSource === 'SOLANA_WALLET' ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={async () => {
                    if (wallet.connected) {
                      await wallet.disconnect()
                      return
                    }
                    setVisible(true)
                  }}
                >
                  {wallet.connected ? `Disconnect ${shortWallet}` : 'Connect wallet'}
                </button>
              ) : null}
              {created?.remittance?.id ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={async () => {
                    try {
                      const out = await api<{ remittance: Remittance }>(`/api/remittances/${created.remittance.id}`)
                      setCreated((prev) => (prev ? { ...prev, remittance: out.remittance } : prev))
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Refresh status
                </button>
              ) : null}
            </div>

            {senderError ? <div className="alert">{senderError}</div> : null}

            {created && txExplorerUrl ? (
              <div style={{ marginTop: 14 }}>
                <style>{`@keyframes stepPulse{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}`}</style>
                {(() => {
                  const completeColor = '#1D9E75'
                  const pendingColor = 'var(--color-border-tertiary)'
                  const textColor = 'var(--color-text-secondary)'

                  const steps = [
                    { label: 'Initiated', done: true },
                    { label: 'Locked on Solana', done: Boolean(txExplorerUrl) },
                    { label: 'Receiver Notified', done: receiverNotified },
                    { label: 'Cash Released', done: created.remittance.status === 'CLAIMED' },
                  ] as const

                  const currentIdx = Math.max(0, steps.findIndex((s) => !s.done))

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {steps.map((s, i) => {
                        const done = s.done
                        const isCurrent = !done && i === currentIdx
                        const circleStyle: React.CSSProperties = {
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `2px solid ${done ? completeColor : pendingColor}`,
                          background: done ? completeColor : 'transparent',
                          color: done ? 'white' : textColor,
                          flex: '0 0 auto',
                          animation: isCurrent ? 'stepPulse 1s ease-in-out infinite' : undefined,
                        }
                        const labelStyle: React.CSSProperties = {
                          marginTop: 6,
                          fontSize: 12,
                          color: textColor,
                          textAlign: 'center',
                          maxWidth: 120,
                        }
                        const lineStyle: React.CSSProperties = {
                          height: 2,
                          width: 70,
                          background: done ? completeColor : pendingColor,
                          opacity: 0.9,
                          flex: '0 0 auto',
                        }
                        return (
                          <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={circleStyle}>{done ? '✓' : i + 1}</div>
                              <div style={labelStyle}>{s.label}</div>
                            </div>
                            {i < steps.length - 1 ? <div style={lineStyle} /> : null}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            ) : null}

            {created ? (
              <div className="result">
                <div className="row">
                  <span className="k">Remittance ID</span>
                  <span className="v">{created.remittance.id}</span>
                </div>
                <div className="row">
                  <span className="k">Status</span>
                  <span className="v pill">{statusLabel(created.remittance.status)}</span>
                </div>
                <div className="row">
                  <span className="k">Sender funding</span>
                  <span className="v">
                    {created.remittance.paymentSource === 'FIAT' ? 'Fiat transfer' : 'Solana wallet'}
                  </span>
                </div>
                <div className="row">
                  <span className="k">FX quote</span>
                  <span className="v">
                    {created.remittance.fx?.pair} @ {created.remittance.fx?.rate} ({created.remittance.fx?.provider})
                  </span>
                </div>
                <div className="row">
                  <span className="k">Claim link</span>
                  <span className="v mono">{created.claimUrl}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className="k" style={{ marginBottom: 8 }}>
                    Receiver scans this QR code
                  </div>
                  <QRCodeSVG value={created.claimUrl} size={180} />
                  <div className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
                    Receiver opens camera → scans → claim page opens automatically
                  </div>
                </div>
                {txExplorerUrl ? (
                  <div className="row">
                    <span className="k">On-chain tx</span>
                    <span className="v mono">
                      <a href={txExplorerUrl} target="_blank" rel="noreferrer">
                        {txExplorerUrl}
                      </a>
                    </span>
                  </div>
                ) : null}
                <div className="actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={async () => {
                      await navigator.clipboard.writeText(created.claimUrl)
                    }}
                  >
                    Copy claim link
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={async () => {
                      try {
                        const out = await api<{ remittance: Remittance }>(
                          `/api/remittances/${created.remittance.id}/cancel`,
                          { method: 'POST' },
                        )
                        setCreated((prev) => (prev ? { ...prev, remittance: out.remittance } : prev))
                      } catch (e: unknown) {
                        setSenderError(getErrorMessage(e) || 'Cancel failed')
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : tab === 'recurring' ? (
          <section className="card">
            <h1>Recurring remittance</h1>
            <p className="muted">Schedule an automatic remittance (demo uses accelerated timing).</p>

            <div className="grid">
              <label className="field">
                <span>Amount</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </label>

              <label className="field">
                <span>Asset</span>
                <select value={asset} onChange={(e) => setAsset(e.target.value as 'USDC' | 'SOL')}>
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                </select>
              </label>

              <label className="field">
                <span>Payout currency</span>
                <input value={payoutCurrency} onChange={(e) => setPayoutCurrency(e.target.value)} />
              </label>

              <label className="field">
                <span>Payout method</span>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as 'MOBILE_MONEY' | 'STABLECOIN' | 'BANK')}
                >
                  <option value="MOBILE_MONEY">Mobile money (eSewa/Khalti)</option>
                  <option value="BANK">Bank transfer</option>
                  <option value="STABLECOIN">Stablecoin (recipient wallet)</option>
                </select>
              </label>

              <label className="field full">
                <span>Recipient hint (phone / handle)</span>
                <input value={recipientHint} onChange={(e) => setRecipientHint(e.target.value)} />
              </label>

              <label className="field full">
                <span>Repeat every</span>
                <select value={repeatEvery} onChange={(e) => setRepeatEvery(e.target.value as '7' | '14' | '30')}>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </label>
            </div>

            <div className="actions">
              <button
                type="button"
                className="primary"
                disabled={scheduling}
                onClick={async () => {
                  setScheduleError(null)
                  setScheduling(true)
                  try {
                    const intervalDays =
                      repeatEvery === '7'
                        ? 0.00139
                        : repeatEvery === '14'
                          ? 0.00278
                          : 0.00595

                    await api<{ schedule: RecurringSchedule }>('/api/recurring', {
                      method: 'POST',
                      body: JSON.stringify({
                        amount,
                        asset,
                        paymentSource: 'FIAT',
                        payoutCurrency,
                        payoutMethod,
                        recipientHint,
                        intervalDays,
                      }),
                    })
                    await refreshSchedules()
                  } catch (e: unknown) {
                    setScheduleError(getErrorMessage(e) || 'Failed to create schedule')
                  } finally {
                    setScheduling(false)
                  }
                }}
              >
                {scheduling ? 'Scheduling…' : 'Schedule'}
              </button>
            </div>

            {scheduleError ? <div className="alert">{scheduleError}</div> : null}

            <div className="result">
              <h2 style={{ marginTop: 0 }}>Active schedules</h2>
              {schedules.length === 0 ? (
                <p className="muted">No active schedules.</p>
              ) : (
                <div className="result" style={{ marginTop: 10 }}>
                  {schedules.map((s) => (
                    <div className="row" key={s.id} style={{ alignItems: 'center' }}>
                      <span className="k" style={{ minWidth: 160 }}>
                        {s.amount} {s.asset}
                      </span>
                      <span className="v">
                        {maskRecipientHint(s.recipientHint)} · every {Math.round(s.intervalDays * 1440)} min · next{' '}
                        {new Date(s.nextRunMs).toLocaleString()}
                      </span>
                      <span className="v" style={{ marginLeft: 'auto' }}>
                        <button
                          type="button"
                          className="danger"
                          onClick={async () => {
                            try {
                              await api(`/api/recurring/${s.id}/deactivate`, { method: 'POST' })
                              await refreshSchedules()
                            } catch {
                              // ignore
                            }
                          }}
                        >
                          Cancel
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="card">
            <h1>Claim remittance</h1>
            <p className="muted">
              Paste the claim token (the part after <span className="mono">#</span>) or open the
              claim link and it will autofill.
            </p>

            <label className="field full">
              <span>Claim token</span>
              <input
                value={claimToken}
                onChange={(e) => setClaimToken(e.target.value)}
                placeholder="e.g. 7Rj... (base64url)"
              />
            </label>

            <p className="muted small" style={{ marginTop: -4 }}>
              {wallet.connected
                ? `Receipt NFT will be minted to ${shortWallet}`
                : 'Tip: connect Phantom before claiming to receive an on-chain NFT receipt.'}
            </p>

            <div className="actions">
              <button
                type="button"
                className="primary"
                disabled={loadingClaim}
                onClick={async () => {
                  setReceiverError(null)
                  setClaimed(null)
                  setLoadingClaim(true)
                  try {
                    const out = await api<{ remittance: Remittance; next: string; nftTx: string | null }>(
                      '/api/claim',
                      {
                        method: 'POST',
                        body: JSON.stringify({
                          token: claimToken,
                          ...(wallet.publicKey ? { receiverPubkey: wallet.publicKey.toBase58() } : {}),
                        }),
                      },
                    )
                    setClaimed(out)
                  } catch (e: unknown) {
                    setReceiverError(getErrorMessage(e) || 'Claim failed')
                  } finally {
                    setLoadingClaim(false)
                  }
                }}
              >
                {loadingClaim ? 'Claiming…' : 'Claim'}
              </button>
            </div>

            {receiverError ? <div className="alert">{receiverError}</div> : null}

            {claimed ? (
              <div className="result">
                {claimed.next === 'OFFRAMP_FIAT' ? (
                  <div
                    style={{
                      marginBottom: 12,
                      border: '1px solid rgba(80, 200, 120, 0.35)',
                      background: 'rgba(80, 200, 120, 0.10)',
                      borderRadius: 12,
                      padding: '10px 12px',
                      color: 'var(--text-h)',
                    }}
                  >
                    ✅ NPR{' '}
                    {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
                      Math.round((Number(claimed.remittance.amount) || 0) * 132),
                    )}{' '}
                    ready for pickup via eSewa/Khalti or nearest agent
                  </div>
                ) : null}
                <div className="row">
                  <span className="k">Status</span>
                  <span className="v pill">{statusLabel(claimed.remittance.status)}</span>
                </div>
                <div className="row">
                  <span className="k">Next step</span>
                  <span className="v">{claimed.next}</span>
                </div>
                <div className="row">
                  <span className="k">Payout method</span>
                  <span className="v">{claimed.remittance.payoutMethod}</span>
                </div>
                {claimed.nftTx ? (
                  <div className="row">
                    <span className="k">NFT Receipt</span>
                    <span className="v">
                      <a
                        href={`https://explorer.solana.com/tx/${claimed.nftTx}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Explorer
                      </a>
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        )}

        <aside className="side card">
          <h2>Savings this session</h2>
          {(() => {
            const total = claimedTotalSent
            const chainNpr = Math.round(total * 132)
            const wuNpr = Math.round(total * 123)
            const savedNpr = Math.max(0, chainNpr - wuNpr)
            const max = Math.max(chainNpr, wuNpr, 1)
            const chainPct = `${Math.round((chainNpr / max) * 100)}%`
            const wuPct = `${Math.round((wuNpr / max) * 100)}%`

            const metricRow: React.CSSProperties = {
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '6px 0',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
            }

            const barWrap: React.CSSProperties = {
              width: '100%',
              border: '1px solid var(--color-border-tertiary)',
              borderRadius: 10,
              padding: 6,
              marginTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }

            const barRow: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }

            const barBase: React.CSSProperties = {
              height: 24,
              borderRadius: 8,
              maxWidth: '100%',
            }

            return (
              <>
                <div style={{ marginTop: 10 }}>
                  <div style={metricRow}>
                    <span>Total sent</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {amountFmt.format(total)} USDC
                    </span>
                  </div>
                  <div style={metricRow}>
                    <span>Via ChainRemit (NPR)</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{nprFmt.format(chainNpr)}</span>
                  </div>
                  <div style={metricRow}>
                    <span>Via Western Union would be (NPR)</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{nprFmt.format(wuNpr)}</span>
                  </div>
                  <div style={metricRow}>
                    <span>You saved (NPR)</span>
                    <span style={{ color: '#1D9E75' }}>{nprFmt.format(savedNpr)}</span>
                  </div>
                </div>

                <div style={barWrap}>
                  <div style={barRow}>
                    <div
                      style={{
                        ...barBase,
                        width: chainPct,
                        background: '#1D9E75',
                      }}
                    />
                    <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      NPR {nprFmt.format(chainNpr)}
                    </div>
                  </div>
                  <div style={barRow}>
                    <div
                      style={{
                        ...barBase,
                        width: wuPct,
                        background: 'var(--color-background-secondary)',
                      }}
                    />
                    <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      NPR {nprFmt.format(wuNpr)}
                    </div>
                  </div>
                </div>

                <div className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
                  Western Union charges ~7% · ChainRemit charges ~0.1%
                </div>

                <div className="hr" />

                <h2>How it works</h2>
                <ol className="list">
                  <li>
                    <strong>Sender</strong> locks funds on Solana{' '}
                    <span className="muted">(instant, ~$0.001 fee)</span>
                  </li>
                  <li>
                    <strong>Receiver</strong> gets SMS with claim code
                  </li>
                  <li>
                    <strong>Receiver</strong> withdraws cash via local agent or eSewa
                  </li>
                  <li>
                    <strong>Agent</strong> releases NPR 13,200 via eSewa — saving NPR 900 vs Western Union
                  </li>
                </ol>
              </>
            )
          })()}
        </aside>
      </main>
      <footer className="muted small" style={{ marginTop: 14 }}>
        Built at Frontier Solana Hackathon · Biratnagar 2026 · Powered by Solana + Pyth Network
      </footer>
          </div>
        }
      />
    </Routes>
  )
}

export default App
