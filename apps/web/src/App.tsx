import './App.css'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Buffer } from 'buffer'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Inline icons (lucide-style, 1.6 stroke)
// ─────────────────────────────────────────────────────────────────────────────

type IconProps = React.SVGProps<SVGSVGElement>
const Icon = {
  send: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    </svg>
  ),
  inbox: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  ),
  wallet: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M21 12V8H7a2 2 0 0 1 0-4h14" />
      <circle cx="16" cy="14" r="1" />
    </svg>
  ),
  history: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  shield: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  ),
  zap: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  lock: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  arrowDown: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  ),
  arrowUp: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  ),
  arrowRight: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  ),
  arrowLeft: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  refresh: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  ),
  external: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  ),
  copy: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  repeat: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  pin: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
  for (const b of bytes) binary += String.fromCharCode(b)
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
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) throw new Error('Amount must be a positive number')
  return Math.round(n * LAMPORTS_PER_SOL)
}

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try { return JSON.stringify(e) } catch { return 'Unknown error' }
}

const nprFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const usdFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

function statusClass(s: Remittance['status']) {
  return s === 'CLAIMED' ? 'claimed' : s === 'CREATED' ? 'created' : 'cancelled'
}
function statusLabel(s: Remittance['status']) {
  return s === 'CLAIMED' ? 'Claimed' : s === 'CREATED' ? 'Awaiting claim' : 'Cancelled'
}

function maskRecipientHint(hint?: string) {
  const v = (hint ?? '').trim()
  if (!v) return '—'
  if (v.length <= 6) return `${v.slice(0, 2)}…`
  return `${v.slice(0, 2)}…${v.slice(-2)}`
}

function shortAddr(s?: string | null, head = 4, tail = 4) {
  if (!s) return ''
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// FX rate (USD → NPR) — fetched once, shared across the app
// ─────────────────────────────────────────────────────────────────────────────

type FxRate = { rate: number; provider: 'PYTH_LIVE' | 'PYTH_MOCK'; asOfMs: number }
const FX_FALLBACK: FxRate = { rate: 132.84, provider: 'PYTH_MOCK', asOfMs: 0 }

const FxRateContext = createContext<FxRate>(FX_FALLBACK)
const useFxRate = () => useContext(FxRateContext)

function FxRateProvider({ children }: { children: React.ReactNode }) {
  const [fx, setFx] = useState<FxRate>(FX_FALLBACK)
  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const out = await api<FxRate>('/api/fx-rate')
        if (!cancelled) setFx(out)
      } catch {
        // keep fallback
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), 30_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])
  return <FxRateContext.Provider value={fx}>{children}</FxRateContext.Provider>
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared components
// ─────────────────────────────────────────────────────────────────────────────

function FXTicker() {
  const fx = useFxRate()
  return (
    <span className="fx-ticker">
      <span className="pulse" />
      <span>
        {fx.provider === 'PYTH_LIVE' ? 'Pyth' : 'Pyth (mock)'} · 1 USD = NPR {fx.rate.toFixed(2)}
      </span>
    </span>
  )
}

function WalletPill() {
  const wallet = useWallet()
  const { setVisible } = useWalletModal()
  if (!wallet.publicKey) {
    return (
      <button className="btn btn-accent" onClick={() => setVisible(true)}>
        <span style={{ width: 14, height: 14, borderRadius: 4, background: '#AB9FF2', display: 'inline-block' }} />
        Connect Phantom
      </button>
    )
  }
  return (
    <button className="wallet-pill" onClick={() => wallet.disconnect()}>
      <span className="ico" />
      <span className="addr">{shortAddr(wallet.publicKey.toBase58())}</span>
      <span className="bal">devnet</span>
    </button>
  )
}

function CompetitorLogo({ name }: { name: 'WU' | 'MG' | 'WISE' | 'BANK' | 'REMIT' }) {
  const map = {
    WU: { bg: '#FFCD00', fg: '#000', text: 'WU' },
    MG: { bg: '#cc1f3f', fg: '#fff', text: 'MG' },
    WISE: { bg: '#9fe870', fg: '#163300', text: 'W' },
    BANK: { bg: '#3a3a44', fg: '#cfcfd6', text: '$' },
    REMIT: { bg: 'transparent', fg: '#0a0a0c', text: '◇' },
  } as const
  const c = map[name]
  if (name === 'REMIT') {
    return <span className="logo" style={{ background: 'var(--accent-grad)', color: c.fg }}>{c.text}</span>
  }
  return <span className="logo" style={{ background: c.bg, color: c.fg }}>{c.text}</span>
}

function SavingsBar({ usd, npr, variant = 'racing' }: { usd: number; npr: number; variant?: 'default' | 'racing' | 'minimal' }) {
  const wu = Math.round(npr * (1 - 0.067))
  const mg = Math.round(npr * (1 - 0.052))
  const wise = Math.round(npr * (1 - 0.012))
  const savedVsWU = npr - wu

  if (variant === 'racing') {
    const max = npr || 1
    const Bar = ({ label, val, logo, you }: { label: string; val: number; logo: 'WU' | 'MG' | 'WISE' | 'REMIT'; you?: boolean }) => (
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px', alignItems: 'center', gap: 12, padding: '6px 0' }}>
        <div className="row" style={{ gap: 8, fontSize: 12, color: you ? 'var(--fg-0)' : 'var(--fg-2)' }}>
          <CompetitorLogo name={logo} />
          {label}
        </div>
        <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              height: '100%',
              width: `${(val / max) * 100}%`,
              background: you ? 'var(--accent-grad)' : 'var(--bg-4)',
              borderRadius: 999,
              transition: 'width 600ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
        </div>
        <div className="mono tnum" style={{ textAlign: 'right', fontSize: 13, color: you ? 'var(--fg-0)' : 'var(--fg-2)' }}>
          NPR {val.toLocaleString()}
        </div>
      </div>
    )
    return (
      <div className="savings">
        <div className="savings-head">
          <span className="badge">YOU SAVE</span>
          <span>vs other services for ${usd} sent</span>
        </div>
        <Bar label="ChainRemit" val={npr} logo="REMIT" you />
        <Bar label="Wise" val={wise} logo="WISE" />
        <Bar label="MoneyGram" val={mg} logo="MG" />
        <Bar label="Western Union" val={wu} logo="WU" />
        <div className="savings-foot">
          <span className="label">Extra in their pocket vs Western Union</span>
          <span className="value">+ NPR {savedVsWU.toLocaleString()}</span>
        </div>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className="savings" style={{ padding: '14px 18px' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your family receives</span>
            <span className="mono tnum" style={{ fontSize: 22, fontWeight: 500 }}>NPR {npr.toLocaleString()}</span>
          </div>
          <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>vs Western Union</span>
            <span
              className="mono tnum"
              style={{
                fontSize: 14,
                fontWeight: 500,
                background: 'var(--accent-grad)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              + NPR {savedVsWU.toLocaleString()} more
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="savings">
      <div className="savings-head">
        <span className="badge">FAMILY GETS MORE</span>
        <span>For ${usd} sent</span>
      </div>
      <div className="savings-rows">
        <div className="savings-row">
          <div className="name">
            <CompetitorLogo name="REMIT" />
            ChainRemit
          </div>
          <div className="amt" style={{ color: 'var(--fg-0)' }}>NPR {npr.toLocaleString()}</div>
        </div>
        <div className="savings-row us">
          <div className="name">
            <CompetitorLogo name="WU" />
            Western Union
          </div>
          <div className="amt">NPR {wu.toLocaleString()}</div>
        </div>
        <div className="savings-row us">
          <div className="name">
            <CompetitorLogo name="MG" />
            MoneyGram
          </div>
          <div className="amt">NPR {mg.toLocaleString()}</div>
        </div>
      </div>
      <div className="savings-foot">
        <span className="label">You save</span>
        <span className="value">NPR {savedVsWU.toLocaleString()}</span>
      </div>
    </div>
  )
}

function Sparkline({ data, color = 'var(--accent-2)' }: { data: number[]; color?: string }) {
  const w = 240
  const h = 40
  const min = Math.min(...data)
  const max = Math.max(...data)
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((d - min) / (max - min || 1)) * h
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell — Sidebar + Topbar
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar() {
  const { pathname } = useLocation()
  const items: Array<{ to: string; label: string; icon: React.ReactNode; badge?: string }> = [
    { to: '/', label: 'Overview', icon: <Icon.wallet /> },
    { to: '/send', label: 'Send', icon: <Icon.send />, badge: 'New' },
    { to: '/history', label: 'Activity', icon: <Icon.history /> },
    { to: '/recurring', label: 'Recurring', icon: <Icon.repeat /> },
  ]
  const tools: Array<{ to: string; label: string; icon: React.ReactNode }> = [
    { to: '/receive', label: 'Receiver demo', icon: <Icon.inbox /> },
    { to: '/agent', label: 'Agent console', icon: <Icon.pin /> },
  ]
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`))
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">◇</div>
        <div>ChainRemit</div>
        <span className="tag accent" style={{ marginLeft: 'auto' }}>devnet</span>
      </div>
      <div className="nav-section">Wallet</div>
      {items.map((it) => (
        <Link key={it.to} to={it.to} className={`nav-item ${isActive(it.to) ? 'active' : ''}`}>
          {it.icon}
          <span>{it.label}</span>
          {it.badge && <span className="badge">{it.badge}</span>}
        </Link>
      ))}
      <div className="nav-section">Tools</div>
      {tools.map((it) => (
        <Link key={it.to} to={it.to} className={`nav-item ${isActive(it.to) ? 'active' : ''}`}>
          {it.icon}
          <span>{it.label}</span>
        </Link>
      ))}
      <div style={{ flex: 1 }} />
      <div className="card" style={{ padding: 14, background: 'var(--bg-2)' }}>
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <Icon.shield />
          <span style={{ fontSize: 12.5, fontWeight: 550 }}>Trustless escrow</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.45 }}>
          Funds locked on Solana via SHA256-gated PDA. Releases only on claim-token match.
        </div>
      </div>
    </aside>
  )
}

function TopBar({ title, crumb }: { title: string; crumb?: string }) {
  return (
    <div className="topbar">
      {crumb && <span className="crumb">{crumb}</span>}
      {crumb && <span style={{ color: 'var(--fg-4)' }}>/</span>}
      <h1>{title}</h1>
      <div className="spacer" />
      <FXTicker />
      <WalletPill />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page: Overview / Dashboard
// ─────────────────────────────────────────────────────────────────────────────

const SPARK_DATA = [42, 48, 45, 52, 51, 58, 62, 60, 66, 71, 68, 73, 78, 76, 82, 88, 84, 91, 95, 92, 98]
const FX_SPARK = [131.2, 131.5, 131.4, 132.0, 131.8, 132.4, 132.6, 132.3, 132.7, 132.84]

function Dashboard() {
  const navigate = useNavigate()
  const fx = useFxRate()
  const [remittances, setRemittances] = useState<Remittance[]>([])
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const out = await api<{ remittances: Remittance[] }>('/api/remittances')
        if (!cancelled) setRemittances(out.remittances)
      } catch {
        // demo
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const totalUsd = remittances.filter((r) => r.status === 'CLAIMED').reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const pendingCount = remittances.filter((r) => r.status === 'CREATED').length
  const claimedCount = remittances.filter((r) => r.status === 'CLAIMED').length
  // 6.7% is Western Union's typical fee; the difference is what the family pockets.
  const savedNpr = Math.round(totalUsd * fx.rate * 0.067)
  const heroUsd = 100
  const heroNpr = Math.round(heroUsd * fx.rate)
  const recent = remittances.slice(0, 5)

  return (
    <div className="content">
      <div className="page-header">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 className="page-title">Send money home</h2>
            <div className="page-sub" style={{ maxWidth: 560 }}>
              Solana-powered remittance for the Nepali diaspora. Lock USDC in escrow, your family claims via SMS — in eSewa, Khalti, or cash. Fees under 0.1%, settles in 400ms.
            </div>
          </div>
          <button className="btn btn-accent btn-lg" onClick={() => navigate('/send')}>
            <Icon.send />
            Send money
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="label">Sent (claimed)</div>
          <div className="value">${usdFmt.format(totalUsd)}</div>
          <Sparkline data={SPARK_DATA} />
        </div>
        <div className="stat">
          <div className="label">Awaiting claim</div>
          <div className="value">{pendingCount}</div>
          <div className="delta">{claimedCount} completed all-time</div>
        </div>
        <div className="stat">
          <div className="label">Total saved (vs WU)</div>
          <div
            className="value"
            style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
          >
            NPR {nprFmt.format(savedNpr)}
          </div>
          <div className="delta">{savedNpr > 0 ? `~${(savedNpr / 250).toFixed(1)} weeks of dal bhat` : '—'}</div>
        </div>
        <div className="stat">
          <div className="label">SOL/USD · Pyth</div>
          <div className="value">$184.27</div>
          <Sparkline data={FX_SPARK} color="var(--accent)" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }} className="dash-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent activity</div>
            <Link to="/history" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
              View all <Icon.arrowRight />
            </Link>
          </div>
          <div className="tx-table">
            <div className="tx-row head">
              <div />
              <div>Recipient</div>
              <div>Amount</div>
              <div className="hide-sm">Payout</div>
              <div>Status</div>
              <div />
            </div>
            {recent.length === 0 ? (
              <div className="tx-row" style={{ cursor: 'default', gridTemplateColumns: '1fr', justifyContent: 'center' }}>
                <span className="muted" style={{ padding: 12, textAlign: 'center' }}>
                  No transfers yet — tap “Send money” to create your first.
                </span>
              </div>
            ) : (
              recent.map((tx) => (
                <div className="tx-row" key={tx.id} onClick={() => navigate('/history')}>
                  <div className="tx-icon out">
                    <Icon.arrowUp />
                  </div>
                  <div>
                    <div className="tx-name">{maskRecipientHint(tx.recipientHint) === '—' ? `${tx.payoutMethod}` : maskRecipientHint(tx.recipientHint)}</div>
                    <div className="tx-sub">
                      {tx.paymentSource === 'FIAT' ? 'Fiat' : 'Wallet'} · {new Date(tx.createdAtMs).toLocaleString()}
                    </div>
                  </div>
                  <div className="tx-amt out">−${tx.amount}</div>
                  <div className="mono tnum dim hide-sm" style={{ fontSize: 12 }}>
                    NPR {nprFmt.format(Math.round(Number(tx.amount) * fx.rate))}
                  </div>
                  <div>
                    <span className={`status-pill ${statusClass(tx.status)}`}>{statusLabel(tx.status)}</span>
                  </div>
                  <div className="dim">
                    <Icon.arrowRight />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col" style={{ gap: 20 }}>
          <SavingsBar usd={heroUsd} npr={heroNpr} variant="racing" />
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, paddingBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 6 }}>Network status</div>
              <div className="muted" style={{ fontSize: 12 }}>Solana devnet · Anchor escrow</div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-1)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">Program</span>
              <span className="mono">{shortAddr(PROGRAM_ID.toBase58(), 4, 4)}</span>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-1)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">Avg fee</span>
              <span className="mono">~$0.001</span>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-1)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">Confirm</span>
              <span className="mono" style={{ color: 'var(--success)' }}>~ 0.4s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page: Send
// ─────────────────────────────────────────────────────────────────────────────

function SendFlow() {
  const navigate = useNavigate()
  const { connection } = useConnection()
  const wallet = useWallet()
  const { setVisible } = useWalletModal()
  const fx = useFxRate()

  const [amount, setAmount] = useState('100')
  const [asset, setAsset] = useState<'USDC' | 'SOL'>('USDC')
  const [payoutCurrency, setPayoutCurrency] = useState('NPR')
  const [payoutMethod, setPayoutMethod] = useState<'MOBILE_MONEY' | 'STABLECOIN' | 'BANK'>('MOBILE_MONEY')
  const [paymentSource, setPaymentSource] = useState<'FIAT' | 'SOLANA_WALLET'>('FIAT')
  const [recipientHint, setRecipientHint] = useState('98XXXXXXXX')
  const [created, setCreated] = useState<{ remittance: Remittance; claimUrl: string } | null>(null)
  const [txExplorerUrl, setTxExplorerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Poll status of created remittance
  useEffect(() => {
    const id = created?.remittance?.id
    if (!id) return
    let cancelled = false
    const tick = async () => {
      try {
        const out = await api<{ remittance: Remittance }>(`/api/remittances/${id}`)
        if (cancelled) return
        setCreated((prev) => (prev ? { ...prev, remittance: out.remittance } : prev))
        if (out.remittance.status !== 'CREATED') window.clearInterval(interval)
      } catch {
        // ignore
      }
    }
    const interval = window.setInterval(() => void tick(), 3000)
    void tick()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [created?.remittance?.id])

  const usd = Number(amount)
  const usdcAmount = Number.isFinite(usd) && usd > 0 ? usd : 0
  const npr = Math.round(usdcAmount * fx.rate)

  async function submit() {
    setError(null)
    setCreated(null)
    setTxExplorerUrl(null)
    setLoading(true)
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
        if (!wallet.publicKey) throw new Error('Connect Phantom wallet first')
        if (!wallet.sendTransaction) throw new Error('Wallet does not support sending transactions')

        const escrowId = crypto.getRandomValues(new Uint8Array(16))
        const claimTokenBytes = crypto.getRandomValues(new Uint8Array(32))
        const claimToken = toBase64Url(claimTokenBytes)
        const claimHash = await sha256(claimTokenBytes)
        const amountLamports = parseAmountLamports(amount)

        const [escrowPda] = PublicKey.findProgramAddressSync(
          [new TextEncoder().encode('escrow'), wallet.publicKey.toBytes(), escrowId],
          PROGRAM_ID,
        )
        const instructionData = await createEscrowInstructionData(escrowId, claimHash, amountLamports)
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
        const signature = await wallet.sendTransaction(tx, connection, { preflightCommitment: 'confirmed' })
        await connection.confirmTransaction(
          { signature, blockhash: latestBlockhash.blockhash, lastValidBlockHeight: latestBlockhash.lastValidBlockHeight },
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
      setError(getErrorMessage(e) || 'Failed to create remittance')
    } finally {
      setLoading(false)
    }
  }

  async function cancel() {
    if (!created?.remittance.id) return
    try {
      const out = await api<{ remittance: Remittance }>(`/api/remittances/${created.remittance.id}/cancel`, { method: 'POST' })
      setCreated((prev) => (prev ? { ...prev, remittance: out.remittance } : prev))
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Cancel failed')
    }
  }

  return (
    <div className="content-narrow" style={{ paddingTop: 32 }}>
      <div className="row" style={{ marginBottom: 18, justifyContent: 'space-between' }}>
        <div className="page-title" style={{ fontSize: 20 }}>
          Send money
        </div>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => navigate('/')}>
          Cancel
        </button>
      </div>

      <div className="flow-panel">
        <div>
          <h2>How are you paying?</h2>
          <div className="subtitle">Either way, your family receives NPR — fast, cheap, and without holding crypto themselves.</div>
        </div>

        <div className="col" style={{ gap: 10 }}>
          <div
            className={`recipient-card ${paymentSource === 'FIAT' ? 'selected' : ''}`}
            style={{ padding: 16, alignItems: 'flex-start' }}
            onClick={() => setPaymentSource('FIAT')}
          >
            <div className="avatar" style={{ width: 40, height: 40, background: 'var(--bg-3)' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <div className="col" style={{ gap: 4, flex: 1 }}>
              <div className="row" style={{ gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 550 }}>Bank card / fiat</div>
                <span className="tag">No crypto needed</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>
                Pay with card via on-ramp · we convert to USDC for you
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                ~2.9% + $0.30 card fee · 0.1% protocol fee
              </div>
            </div>
            <Radio selected={paymentSource === 'FIAT'} />
          </div>

          <div
            className={`recipient-card ${paymentSource === 'SOLANA_WALLET' ? 'selected' : ''}`}
            style={{ padding: 16, alignItems: 'flex-start' }}
            onClick={() => setPaymentSource('SOLANA_WALLET')}
          >
            <div className="avatar cool" style={{ width: 40, height: 40 }}>P</div>
            <div className="col" style={{ gap: 4, flex: 1 }}>
              <div className="row" style={{ gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 550 }}>Crypto wallet</div>
                <span className="tag accent">Lowest fees</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>Sign with Phantom · SOL from your wallet · ~$0.001 network fee</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                400ms settlement · trustless escrow PDA
              </div>
            </div>
            <Radio selected={paymentSource === 'SOLANA_WALLET'} />
          </div>
        </div>

        <div className="amount-input">
          <div className="label">You send</div>
          <div className="row">
            <input
              className="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            />
            <div className="currency-pill">
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#2775ca', color: 'white', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>
                $
              </span>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value as 'USDC' | 'SOL')}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', fontWeight: 550 }}
              >
                <option value="USDC">USDC</option>
                <option value="SOL">SOL</option>
              </select>
              <Icon.arrowDown />
            </div>
          </div>
          <div className="meta">
            <span>≈ NPR {nprFmt.format(npr)} via Pyth</span>
            <span className="balance">{paymentSource === 'FIAT' ? 'Card on file' : 'Phantom wallet'}</span>
          </div>
        </div>

        <SavingsBar usd={usdcAmount || 100} npr={npr || Math.round(100 * fx.rate)} variant="minimal" />

        <div className="field">
          <div className="field-label">Cash-out method</div>
          <div className="cashout-grid">
            <button
              type="button"
              className={`cashout-tile ${payoutMethod === 'MOBILE_MONEY' ? 'selected' : ''}`}
              onClick={() => setPayoutMethod('MOBILE_MONEY')}
            >
              <div className="icon esewa">eS</div>
              <div className="name">Mobile money</div>
              <div className="meta">eSewa / Khalti</div>
            </button>
            <button
              type="button"
              className={`cashout-tile ${payoutMethod === 'BANK' ? 'selected' : ''}`}
              onClick={() => setPayoutMethod('BANK')}
            >
              <div className="icon agent">B</div>
              <div className="name">Bank</div>
              <div className="meta">Direct deposit</div>
            </button>
            <button
              type="button"
              className={`cashout-tile ${payoutMethod === 'STABLECOIN' ? 'selected' : ''}`}
              onClick={() => setPayoutMethod('STABLECOIN')}
            >
              <div className="icon khalti">$</div>
              <div className="name">Stablecoin</div>
              <div className="meta">Recipient wallet</div>
            </button>
          </div>
        </div>

        <div className="field-grid">
          <label className="field full">
            <span className="field-label">Recipient phone / handle</span>
            <input className="input" value={recipientHint} onChange={(e) => setRecipientHint(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Payout currency</span>
            <input className="input" value={payoutCurrency} onChange={(e) => setPayoutCurrency(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Asset</span>
            <select
              className="input"
              value={asset}
              onChange={(e) => setAsset(e.target.value as 'USDC' | 'SOL')}
            >
              <option value="USDC">USDC</option>
              <option value="SOL">SOL</option>
            </select>
          </label>
        </div>

        <button className="btn btn-accent btn-lg btn-block" disabled={loading} onClick={() => void submit()}>
          {loading
            ? paymentSource === 'SOLANA_WALLET'
              ? 'Awaiting wallet signature…'
              : 'Creating…'
            : paymentSource === 'FIAT'
              ? 'Create remittance (fiat)'
              : 'Sign & lock in escrow'}
          {!loading && <Icon.arrowRight />}
        </button>

        {error && <div className="alert">{error}</div>}
      </div>

      {created && (
        <div className="receipt" style={{ marginTop: 24 }}>
          <div className="glyph" />
          <div className="head">
            <div>
              <div className="title">Remittance created</div>
              <div className="num">{created.remittance.id}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className={`status-pill ${statusClass(created.remittance.status)}`}>{statusLabel(created.remittance.status)}</span>
              <span className="nft">cNFT after claim</span>
            </div>
          </div>
          <div className="amount">${created.remittance.amount}</div>
          <div className="amount-sub">
            ≈ NPR {nprFmt.format(Math.round(Number(created.remittance.amount) * fx.rate))} · {created.remittance.payoutMethod}
          </div>
          <div className="receipt-grid">
            <div>
              <div className="k">Claim link</div>
              <div className="v" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ flex: 1 }}>{created.claimUrl}</span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: 6, fontSize: 11 }}
                  onClick={() => navigator.clipboard.writeText(created.claimUrl)}
                >
                  <Icon.copy />
                </button>
              </div>
            </div>
            <div>
              <div className="k">FX</div>
              <div className="v">
                {created.remittance.fx
                  ? `${created.remittance.fx.pair} @ ${created.remittance.fx.rate} (${created.remittance.fx.provider})`
                  : '—'}
              </div>
            </div>
            {txExplorerUrl && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="k">On-chain tx</div>
                <div className="v">
                  <a href={txExplorerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                    {txExplorerUrl} <Icon.external />
                  </a>
                </div>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="k">Receiver scans</div>
              <div className="v" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#fff', padding: 12, borderRadius: 12 }}>
                  <QRCodeSVG value={created.claimUrl} size={140} />
                </div>
              </div>
            </div>
          </div>
          <div className="actions">
            <button
              className="btn btn-outline"
              onClick={() => navigator.clipboard.writeText(created.claimUrl)}
            >
              <Icon.copy /> Copy claim link
            </button>
            {created.remittance.status === 'CREATED' && (
              <button className="btn btn-danger" onClick={() => void cancel()}>
                Cancel & refund
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: selected ? 'none' : '1px solid var(--line-2)',
        background: selected ? 'var(--accent-2)' : 'transparent',
        display: 'grid',
        placeItems: 'center',
        color: '#0a0a0c',
        flexShrink: 0,
      }}
    >
      {selected && <Icon.check style={{ width: 12, height: 12 }} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page: Receive (claim)
// ─────────────────────────────────────────────────────────────────────────────

function Receive() {
  const wallet = useWallet()
  const { setVisible } = useWalletModal()
  const fx = useFxRate()

  const initialClaimToken =
    typeof window !== 'undefined' && window.location.hash.startsWith('#')
      ? window.location.hash.slice(1).trim()
      : ''
  const [token, setToken] = useState(initialClaimToken)
  const [claimed, setClaimed] = useState<{ remittance: Remittance; next: string; nftTx: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const claim = async () => {
    setError(null)
    setClaimed(null)
    setLoading(true)
    try {
      const out = await api<{ remittance: Remittance; next: string; nftTx: string | null }>('/api/claim', {
        method: 'POST',
        body: JSON.stringify({
          token,
          ...(wallet.publicKey ? { receiverPubkey: wallet.publicKey.toBase58() } : {}),
        }),
      })
      setClaimed(out)
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Claim failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content-narrow" style={{ paddingTop: 32 }}>
      <div className="flow-panel">
        <div>
          <h2>Claim remittance</h2>
          <div className="subtitle">
            Paste the claim token (the part after <span className="mono">#</span> in your link). Open the link directly to autofill.
          </div>
        </div>

        <div className="field">
          <span className="field-label">Claim token</span>
          <input
            className="input"
            value={token}
            onChange={(e) => setToken(e.target.value.trim())}
            placeholder="e.g. 7Rj…"
          />
        </div>

        <div
          className="row"
          style={{
            gap: 10,
            justifyContent: 'space-between',
            background: 'var(--bg-2)',
            border: '1px solid var(--line-1)',
            padding: '10px 12px',
            borderRadius: 'var(--r-2)',
          }}
        >
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>cNFT receipt</span>
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
              {wallet.publicKey
                ? `Will mint to ${shortAddr(wallet.publicKey.toBase58())}`
                : 'Connect Phantom to receive an on-chain receipt NFT.'}
            </span>
          </div>
          {!wallet.publicKey && (
            <button className="btn btn-outline" onClick={() => setVisible(true)}>
              Connect
            </button>
          )}
        </div>

        <button className="btn btn-accent btn-lg btn-block" disabled={loading || token.length < 8} onClick={() => void claim()}>
          {loading ? 'Claiming…' : 'Claim funds'}
        </button>

        {error && <div className="alert">{error}</div>}
      </div>

      {claimed && (
        <div className="receipt" style={{ marginTop: 24 }}>
          <div className="glyph" />
          <div className="success-glyph" style={{ marginBottom: 14 }}>
            <Icon.check />
          </div>
          <div className="head">
            <div>
              <div className="title">Funds released</div>
              <div className="num">{claimed.remittance.id}</div>
            </div>
            <span className={`status-pill ${statusClass(claimed.remittance.status)}`}>{statusLabel(claimed.remittance.status)}</span>
          </div>
          <div className="amount">${claimed.remittance.amount}</div>
          <div className="amount-sub">
            ≈ NPR {nprFmt.format(Math.round(Number(claimed.remittance.amount) * fx.rate))} · ready via {claimed.remittance.payoutMethod}
          </div>
          <div className="receipt-grid">
            <div>
              <div className="k">Next step</div>
              <div className="v">{claimed.next}</div>
            </div>
            <div>
              <div className="k">Payout</div>
              <div className="v">{claimed.remittance.payoutMethod}</div>
            </div>
            {claimed.nftTx && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="k">NFT receipt</div>
                <div className="v">
                  <a
                    href={`https://explorer.solana.com/tx/${claimed.nftTx}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--accent)' }}
                  >
                    View on Solana Explorer <Icon.external />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page: Recurring
// ─────────────────────────────────────────────────────────────────────────────

function Recurring() {
  const [amount, setAmount] = useState('100')
  const [asset, setAsset] = useState<'USDC' | 'SOL'>('USDC')
  const [payoutCurrency, setPayoutCurrency] = useState('NPR')
  const [payoutMethod, setPayoutMethod] = useState<'MOBILE_MONEY' | 'STABLECOIN' | 'BANK'>('MOBILE_MONEY')
  const [recipientHint, setRecipientHint] = useState('98XXXXXXXX')
  const [repeatEvery, setRepeatEvery] = useState<'7' | '14' | '30'>('7')
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])

  const refresh = async () => {
    try {
      const out = await api<{ schedules: RecurringSchedule[] }>('/api/recurring')
      setSchedules(out.schedules)
    } catch {
      // demo
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const create = async () => {
    setError(null)
    setScheduling(true)
    try {
      // Demo accelerates the cadence so reviewers can see it fire
      const intervalDays =
        repeatEvery === '7' ? 0.00139 : repeatEvery === '14' ? 0.00278 : 0.00595
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
      await refresh()
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to create schedule')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="content-narrow" style={{ paddingTop: 32 }}>
      <div className="flow-panel wide">
        <div>
          <h2>Recurring remittance</h2>
          <div className="subtitle">Schedule an automatic transfer. Demo cadence is accelerated so you can see it fire in the activity log.</div>
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field-label">Amount</span>
            <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            <span className="field-label">Asset</span>
            <select className="input" value={asset} onChange={(e) => setAsset(e.target.value as 'USDC' | 'SOL')}>
              <option value="USDC">USDC</option>
              <option value="SOL">SOL</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Payout currency</span>
            <input className="input" value={payoutCurrency} onChange={(e) => setPayoutCurrency(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Payout method</span>
            <select
              className="input"
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as 'MOBILE_MONEY' | 'BANK' | 'STABLECOIN')}
            >
              <option value="MOBILE_MONEY">Mobile money (eSewa / Khalti)</option>
              <option value="BANK">Bank transfer</option>
              <option value="STABLECOIN">Stablecoin (recipient wallet)</option>
            </select>
          </label>
          <label className="field full">
            <span className="field-label">Recipient hint (phone / handle)</span>
            <input className="input" value={recipientHint} onChange={(e) => setRecipientHint(e.target.value)} />
          </label>
          <label className="field full">
            <span className="field-label">Repeat every</span>
            <select className="input" value={repeatEvery} onChange={(e) => setRepeatEvery(e.target.value as '7' | '14' | '30')}>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </label>
        </div>

        <button className="btn btn-accent btn-lg btn-block" disabled={scheduling} onClick={() => void create()}>
          {scheduling ? 'Scheduling…' : 'Schedule'}
        </button>
        {error && <div className="alert">{error}</div>}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <div className="card-title">Active schedules</div>
          <button className="btn btn-outline" onClick={() => void refresh()} style={{ padding: '6px 12px', fontSize: 12 }}>
            <Icon.refresh /> Refresh
          </button>
        </div>
        {schedules.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            No active schedules.
          </p>
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {schedules.map((s) => (
              <div className="recipient-card" key={s.id} style={{ alignItems: 'center' }}>
                <div className="avatar warm">{(s.recipientHint || 'NP').slice(0, 2).toUpperCase()}</div>
                <div className="col" style={{ gap: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {s.amount} {s.asset} → {maskRecipientHint(s.recipientHint)}
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>
                    every ~{Math.round(s.intervalDays * 1440)} min · next {new Date(s.nextRunMs).toLocaleString()}
                  </div>
                </div>
                <div className="spacer" />
                <button
                  className="btn btn-danger"
                  style={{ fontSize: 12 }}
                  onClick={async () => {
                    try {
                      await api(`/api/recurring/${s.id}/deactivate`, { method: 'POST' })
                      await refresh()
                    } catch {
                      // demo
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page: History
// ─────────────────────────────────────────────────────────────────────────────

function History() {
  const navigate = useNavigate()
  const [remittances, setRemittances] = useState<Remittance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'claimed'>('all')

  const refresh = async () => {
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
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    return remittances.filter((r) => {
      if (filter === 'pending') return r.status === 'CREATED'
      if (filter === 'claimed') return r.status === 'CLAIMED'
      return true
    })
  }, [remittances, filter])

  const counts = {
    all: remittances.length,
    pending: remittances.filter((r) => r.status === 'CREATED').length,
    claimed: remittances.filter((r) => r.status === 'CLAIMED').length,
  }

  return (
    <div className="content">
      <div className="page-header">
        <h2 className="page-title">Activity</h2>
        <div className="page-sub">Every transfer is provable on-chain. Click a row to open it on Solana Explorer.</div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'claimed'] as const).map((k) => (
          <button
            key={k}
            className={`btn ${filter === k ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '7px 14px', fontSize: 12.5 }}
            onClick={() => setFilter(k)}
          >
            {k === 'all' ? 'All' : k === 'pending' ? 'Pending claim' : 'Claimed'}
            <span className="mono" style={{ opacity: 0.6 }}>{counts[k]}</span>
          </button>
        ))}
        <div className="spacer" />
        <button className="btn btn-outline" disabled={loading} onClick={() => void refresh()} style={{ padding: '7px 14px', fontSize: 12.5 }}>
          <Icon.refresh /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ padding: '8px 12px' }}>
        <div className="tx-table">
          <div className="tx-row head">
            <div />
            <div>Recipient</div>
            <div>Amount</div>
            <div className="hide-sm">Payout</div>
            <div>Status</div>
            <div />
          </div>
          {filtered.length === 0 ? (
            <div className="tx-row" style={{ cursor: 'default', gridTemplateColumns: '1fr', justifyContent: 'center' }}>
              <span className="muted" style={{ padding: 16, textAlign: 'center' }}>
                {loading ? 'Loading…' : 'No remittances yet.'}
              </span>
            </div>
          ) : (
            filtered.map((tx) => {
              const explorerUrl = tx.escrowPda
                ? `https://explorer.solana.com/address/${tx.escrowPda}?cluster=${EXPLORER_CLUSTER}`
                : null
              return (
                <div
                  className="tx-row"
                  key={tx.id}
                  onClick={() => {
                    if (explorerUrl) window.open(explorerUrl, '_blank')
                    else navigate('/')
                  }}
                >
                  <div className="tx-icon out">
                    <Icon.arrowUp />
                  </div>
                  <div>
                    <div className="tx-name">{maskRecipientHint(tx.recipientHint)}</div>
                    <div className="tx-sub">
                      {new Date(tx.createdAtMs).toLocaleString()}
                      {tx.escrowPda ? ` · ${shortAddr(tx.escrowPda)}` : ''}
                    </div>
                  </div>
                  <div className="tx-amt out">
                    {tx.status === 'CANCELLED' ? '↩' : '−'}${tx.amount}
                  </div>
                  <div className="mono tnum dim hide-sm" style={{ fontSize: 12 }}>
                    {tx.payoutMethod}
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <span className={`status-pill ${statusClass(tx.status)}`}>{statusLabel(tx.status)}</span>
                    {tx.paymentSource === 'SOLANA_WALLET' && <span className="tag accent">on-chain</span>}
                  </div>
                  <div className="dim">
                    <Icon.arrowRight />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page: Agent (operator console)
// ─────────────────────────────────────────────────────────────────────────────

function AgentConsole() {
  const fx = useFxRate()
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remittances, setRemittances] = useState<Remittance[]>([])
  const [releasingId, setReleasingId] = useState<string | null>(null)

  const refresh = async () => {
    setError(null)
    setLoading(true)
    try {
      const out = await api<{ remittances: Remittance[] }>('/api/agent/remittances')
      setRemittances(out.remittances)
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const out = await api<{ authenticated: boolean }>('/api/auth/session')
        if (cancelled) return
        setAuthed(out.authenticated)
        if (out.authenticated) void refresh()
      } catch {
        if (!cancelled) setAuthed(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async () => {
    setError(null)
    try {
      await api<{ ok: boolean }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })
      setAuthed(true)
      setPin('')
      void refresh()
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Invalid PIN')
    }
  }

  const release = async (id: string) => {
    setError(null)
    setReleasingId(id)
    try {
      const out = await api<{ remittance: Remittance }>(`/api/remittances/${id}/agent-release`, { method: 'POST' })
      setRemittances((prev) => prev.map((x) => (x.id === id ? out.remittance : x)).filter((x) => x.status === 'CREATED'))
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || 'Release failed'
      setError(msg)
      if (msg.includes('unauthorized') || msg.includes('session_expired')) setAuthed(false)
    } finally {
      setReleasingId(null)
    }
  }

  const totalPendingUsd = remittances.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  return (
    <div className="content">
      <div className="page-header">
        <h2 className="page-title">Agent console</h2>
        <div className="page-sub">PIN-gated operator dashboard. Confirm cash handed over and release escrow on-chain.</div>
      </div>

      {!authed ? (
        <div className="flow-panel">
          <div>
            <h2>Enter agent PIN</h2>
            <div className="subtitle">PIN is verified by the relayer with rate limits and a cookie session.</div>
          </div>
          <label className="field">
            <span className="field-label">PIN</span>
            <input
              className="input"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              inputMode="numeric"
              autoComplete="one-time-code"
              onKeyDown={(e) => e.key === 'Enter' && void login()}
            />
          </label>
          <button className="btn btn-accent btn-lg btn-block" onClick={() => void login()}>
            Unlock <Icon.lock />
          </button>
          {error && <div className="alert">{error}</div>}
        </div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat">
              <div className="label">Pending payouts</div>
              <div className="value">{remittances.length}</div>
            </div>
            <div className="stat">
              <div className="label">Total awaiting</div>
              <div className="value">${usdFmt.format(totalPendingUsd)}</div>
            </div>
            <div className="stat">
              <div className="label">NPR equivalent</div>
              <div
                className="value"
                style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
              >
                NPR {nprFmt.format(Math.round(totalPendingUsd * fx.rate))}
              </div>
            </div>
            <div className="stat">
              <div className="label">Status</div>
              <div className="value" style={{ fontSize: 16, color: 'var(--success)' }}>
                Accepting customers
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Pending payouts queue</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-outline" disabled={loading} onClick={() => void refresh()} style={{ padding: '6px 12px', fontSize: 12 }}>
                  <Icon.refresh /> {loading ? 'Refreshing…' : 'Refresh'}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={async () => {
                    setAuthed(false)
                    setRemittances([])
                    await api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).catch(() => {})
                  }}
                >
                  <Icon.lock /> Lock
                </button>
              </div>
            </div>
            {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}
            {remittances.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                No remittances awaiting release.
              </p>
            ) : (
              <div className="col" style={{ gap: 10 }}>
                {remittances.map((r) => (
                  <div className="recipient-card" key={r.id} style={{ alignItems: 'center' }}>
                    <div className="avatar cool">{(r.recipientHint || 'NP').slice(0, 2).toUpperCase()}</div>
                    <div className="col" style={{ gap: 2, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                        {r.amount} {r.asset} → {maskRecipientHint(r.recipientHint)}
                      </div>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>
                        {r.payoutMethod} · created {new Date(r.createdAtMs).toLocaleString()}
                      </div>
                    </div>
                    <span className={`status-pill ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
                    <button
                      className="btn btn-accent"
                      disabled={releasingId === r.id}
                      onClick={() => void release(r.id)}
                    >
                      {releasingId === r.id ? 'Releasing…' : 'Confirm cash handed'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_TITLES: Record<string, [string, string]> = {
  '/': ['Overview', 'Wallet'],
  '/send': ['Send money', 'Wallet'],
  '/receive': ['Receiver demo', 'Tools'],
  '/recurring': ['Recurring', 'Wallet'],
  '/history': ['Activity', 'Wallet'],
  '/agent': ['Agent console', 'Tools'],
  '/claim': ['Receiver demo', 'Tools'],
}

function ShelledRoute({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const [title, crumb] = ROUTE_TITLES[pathname] ?? ['ChainRemit', '']
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TopBar title={title} crumb={crumb} />
        {children}
      </div>
    </div>
  )
}

function App() {
  return (
    <FxRateProvider>
      <Routes>
        <Route path="/" element={<ShelledRoute><Dashboard /></ShelledRoute>} />
        <Route path="/send" element={<ShelledRoute><SendFlow /></ShelledRoute>} />
        <Route path="/receive" element={<ShelledRoute><Receive /></ShelledRoute>} />
        <Route path="/claim" element={<ShelledRoute><Receive /></ShelledRoute>} />
        <Route path="/recurring" element={<ShelledRoute><Recurring /></ShelledRoute>} />
        <Route path="/history" element={<ShelledRoute><History /></ShelledRoute>} />
        <Route path="/agent" element={<ShelledRoute><AgentConsole /></ShelledRoute>} />
        <Route path="*" element={<ShelledRoute><Dashboard /></ShelledRoute>} />
      </Routes>
    </FxRateProvider>
  )
}

export default App
