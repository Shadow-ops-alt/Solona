import './App.css'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
  settings: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  locate: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="2" x2="5" y1="12" y2="12" />
      <line x1="19" x2="22" y1="12" y2="12" />
      <line x1="12" x2="12" y1="2" y2="5" />
      <line x1="12" x2="12" y1="19" y2="22" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  clock: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  upload: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 5v14" />
      <path d="m5 12 7-7 7 7" />
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

type FxRate = {
  pair: 'USD/NPR'
  rate: number
  provider: 'LIVE' | 'CACHED' | 'FALLBACK'
  asOfMs: number
  nextRefreshMs: number
}
const FX_FALLBACK: FxRate = { pair: 'USD/NPR', rate: 134.0, provider: 'FALLBACK', asOfMs: 0, nextRefreshMs: 0 }

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
        // keep current value (fallback or last known)
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), 60_000)
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
  const isLive = fx.provider === 'LIVE'
  const dotColor =
    fx.provider === 'LIVE' ? 'var(--success)' : fx.provider === 'CACHED' ? 'var(--fg-3)' : 'var(--warn)'
  return (
    <span className="fx-ticker">
      <span
        className={isLive ? 'pulse' : ''}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dotColor,
          animation: isLive ? undefined : 'none',
        }}
      />
      <span>Pyth · 1 USD = NPR {fx.rate.toFixed(2)}</span>
      <span
        style={{
          marginLeft: 4,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.06em',
          padding: '1px 5px',
          borderRadius: 4,
          background: dotColor,
          color: '#0a0a0c',
        }}
      >
        {fx.provider}
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
    { to: '/agent', label: 'Agent locator', icon: <Icon.pin /> },
    { to: '/agent/console', label: 'Agent console', icon: <Icon.lock /> },
    { to: '/kyc', label: 'Verify identity', icon: <Icon.shield /> },
    { to: '/settings', label: 'Settings', icon: <Icon.settings /> },
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

  const formRef = useRef<HTMLDivElement>(null)
  const showHero = !wallet.connected && paymentSource === 'SOLANA_WALLET'
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
    <>
      {showHero && (
        <div className="hero">
          <div className="hero-left">
            <div className="row" style={{ gap: 8 }}>
              <span className="pill"><span className="dot" />Live on Solana devnet</span>
            </div>
            <h1 className="display">
              Send money home.<br />
              Not <span className="grad">fees</span>.
            </h1>
            <div style={{ fontSize: 16, color: 'var(--fg-2)', maxWidth: 460, lineHeight: 1.5 }}>
              Lock USDC in escrow on Solana. Your family claims via SMS — eSewa, Khalti, or cash. Under 0.1% fees, settles in 400ms.
            </div>
            <div className="row" style={{ gap: 10, marginTop: 10 }}>
              <button className="btn btn-accent btn-lg" onClick={scrollToForm}>
                Get started <Icon.arrowRight />
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={() => setPaymentSource('FIAT')}
              >
                Pay with card instead
              </button>
            </div>
          </div>
          <div className="hero-right">
            <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--fg-3)',
                  marginBottom: 10,
                }}
              >
                Live comparison · $100 to Nepal
              </div>
              <SavingsBar usd={100} npr={Math.round(100 * fx.rate)} variant="racing" />
            </div>
          </div>
        </div>
      )}

    <div ref={formRef} className="content-narrow" style={{ paddingTop: 32 }}>
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
    </>
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
// Page: Agent locator (frontend-only; static agent list)
// ─────────────────────────────────────────────────────────────────────────────

type Agent = {
  id: number
  name: string
  addr: string
  dist: string
  open: boolean
  hours: string
  rating: number
  reviews: number
  x: number
  y: number
  fee: string
}

const AGENTS: Agent[] = [
  { id: 1, name: 'Himalayan Money Transfer', addr: 'Thamel, Kathmandu', dist: '0.4 km', open: true,  hours: '7:00 – 21:00', rating: 4.9, reviews: 312, x: 28, y: 42, fee: '0.5%' },
  { id: 2, name: 'Annapurna Cash Point',     addr: 'New Road, Kathmandu', dist: '1.2 km', open: true,  hours: '8:00 – 20:00', rating: 4.8, reviews: 187, x: 46, y: 58, fee: '0.5%' },
  { id: 3, name: 'Everest Remit Hub',        addr: 'Boudha, Kathmandu',   dist: '2.8 km', open: true,  hours: '9:00 – 19:00', rating: 4.7, reviews:  94, x: 68, y: 34, fee: '0.7%' },
  { id: 4, name: 'Pokhara Express Cash',     addr: 'Lakeside, Pokhara',   dist: '198 km', open: false, hours: 'Opens 7:00',   rating: 4.9, reviews: 421, x: 18, y: 76, fee: '0.5%' },
  { id: 5, name: 'Patan Money Mart',         addr: 'Mangal Bazaar, Lalitpur', dist: '4.1 km', open: true, hours: '8:00 – 22:00', rating: 4.6, reviews: 256, x: 52, y: 78, fee: '0.6%' },
  { id: 6, name: 'Bhaktapur Remittance',     addr: 'Durbar Square, Bhaktapur', dist: '12.6 km', open: true, hours: '7:30 – 20:30', rating: 4.8, reviews: 143, x: 82, y: 52, fee: '0.5%' },
]

function AgentLocator() {
  const [selected, setSelected] = useState<Agent>(AGENTS[0])
  const [filter, setFilter] = useState<'all' | 'open'>('all')
  const filtered = filter === 'open' ? AGENTS.filter((a) => a.open) : AGENTS
  return (
    <div className="content" style={{ padding: 0, height: 'calc(100vh - 60px)', display: 'flex' }}>
      <div style={{ width: 380, borderRight: '1px solid var(--line-1)', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--line-1)' }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <h1 style={{ fontSize: 20, margin: 0, letterSpacing: '-0.02em' }}>Cash-out agents</h1>
            <div className="spacer" />
            <span className="tag">Nepal</span>
          </div>
          <div className="search-bar" style={{ marginBottom: 10 }}>
            <Icon.search />
            <input placeholder="Search by area or agent name…" />
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All ({AGENTS.length})</button>
            <button className={`chip ${filter === 'open' ? 'on' : ''}`} onClick={() => setFilter('open')}>Open now</button>
            <button className="chip">Highest rated</button>
            <button className="chip">Nearest</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--line-1)',
                cursor: 'pointer',
                background: selected.id === a.id ? 'rgba(183,148,255,0.08)' : 'transparent',
                borderLeft: selected.id === a.id ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <div className="row" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 13.5, fontWeight: 550 }}>{a.name}</span>
                <div className="spacer" />
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{a.dist}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginBottom: 6 }}>{a.addr}</div>
              <div className="row" style={{ gap: 8, fontSize: 11 }}>
                <span className="row" style={{ gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.open ? 'var(--success)' : 'var(--fg-3)' }} />
                  <span style={{ color: a.open ? 'var(--success)' : 'var(--fg-3)' }}>{a.open ? 'Open' : 'Closed'}</span>
                </span>
                <span style={{ color: 'var(--fg-3)' }}>· {a.hours}</span>
                <div className="spacer" />
                <span style={{ color: 'var(--fg-2)' }}>★ {a.rating}</span>
                <span className="mono" style={{ color: 'var(--fg-3)' }}>· {a.fee}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', background: 'var(--bg-0)', display: 'flex', flexDirection: 'column' }}>
        <AgentMap agents={filtered} selected={selected} setSelected={setSelected} />
        <AgentDetail agent={selected} />
      </div>
    </div>
  )
}

function AgentMap({ agents, selected, setSelected }: { agents: Agent[]; selected: Agent; setSelected: (a: Agent) => void }) {
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 40%, #1a1a22 0%, #0d0d12 80%)' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
        <defs>
          <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(183,148,255,0.08)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-grid)" />
        <path d="M 0,300 Q 200,260 400,320 T 800,280 T 1200,310" stroke="rgba(95,225,196,0.18)" strokeWidth="2" fill="none" />
        <path d="M 100,500 Q 300,460 500,520 T 900,500" stroke="rgba(95,225,196,0.12)" strokeWidth="1.5" fill="none" />
        <ellipse cx="50%" cy="50%" rx="35%" ry="25%" stroke="rgba(183,148,255,0.10)" fill="none" strokeWidth="0.6" />
        <ellipse cx="50%" cy="50%" rx="25%" ry="18%" stroke="rgba(183,148,255,0.10)" fill="none" strokeWidth="0.6" />
        <ellipse cx="50%" cy="50%" rx="15%" ry="11%" stroke="rgba(183,148,255,0.10)" fill="none" strokeWidth="0.6" />
        <path d="M 0,200 L 1200,500" stroke="rgba(255,255,255,0.04)" strokeWidth="14" fill="none" />
        <path d="M 200,0 L 700,800" stroke="rgba(255,255,255,0.04)" strokeWidth="14" fill="none" />
        <path d="M 1200,100 L 0,700" stroke="rgba(255,255,255,0.03)" strokeWidth="10" fill="none" />
      </svg>
      <div style={{ position: 'absolute', left: '38%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <div className="me-pulse" />
        <div className="me-pulse delay" />
        <div className="me-dot" />
      </div>
      {agents.map((a) => {
        const isSel = selected.id === a.id
        return (
          <div
            key={a.id}
            onClick={() => setSelected(a)}
            className="map-pin"
            style={{
              position: 'absolute',
              left: `${a.x}%`,
              top: `${a.y}%`,
              transform: `translate(-50%, -100%) scale(${isSel ? 1.15 : 1})`,
              cursor: 'pointer',
              zIndex: isSel ? 10 : 1,
            }}
          >
            <svg width="36" height="44" viewBox="0 0 36 44">
              <defs>
                <linearGradient id={`pg-${a.id}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={isSel ? '#B794FF' : a.open ? '#5FE1C4' : '#4a4a55'} />
                  <stop offset="100%" stopColor={isSel ? '#8E6CFF' : a.open ? '#3FBFA4' : '#2a2a32'} />
                </linearGradient>
              </defs>
              <path d="M 18 0 C 8 0 0 8 0 18 C 0 28 18 44 18 44 C 18 44 36 28 36 18 C 36 8 28 0 18 0 Z" fill={`url(#pg-${a.id})`} stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
              <circle cx="18" cy="17" r="6" fill="white" fillOpacity="0.95" />
              <text x="18" y="21" textAnchor="middle" fontSize="9" fontWeight="700" fill={isSel ? '#5d3aa8' : '#0a4a3a'}>$</text>
            </svg>
            {isSel && <div className="pin-label">{a.name.split(' ')[0]}</div>}
          </div>
        )
      })}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="map-ctrl">+</button>
        <button className="map-ctrl">−</button>
        <button className="map-ctrl"><Icon.locate /></button>
      </div>
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6 }}>
        <button className="chip on">Map</button>
        <button className="chip">Satellite</button>
      </div>
      <div style={{ position: 'absolute', bottom: 16, left: 16, padding: '8px 12px', background: 'rgba(15,15,20,0.85)', backdropFilter: 'blur(12px)', border: '1px solid var(--line-1)', borderRadius: 10, display: 'flex', gap: 14, fontSize: 11, color: 'var(--fg-2)' }}>
        <span className="row" style={{ gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5FE1C4' }} />Open</span>
        <span className="row" style={{ gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4a4a55' }} />Closed</span>
        <span className="row" style={{ gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B794FF' }} />Selected</span>
        <span style={{ color: 'var(--fg-3)' }}>· {agents.length} agents in view</span>
      </div>
      <style>{`
        .me-dot { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 14px; height: 14px; border-radius: 50%; background: #5b8dff; border: 3px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.3), 0 4px 10px rgba(91,141,255,0.6); z-index: 5; }
        .me-pulse { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 14px; height: 14px; border-radius: 50%; background: rgba(91,141,255,0.4); animation: mePulse 2.4s ease-out infinite; }
        .me-pulse.delay { animation-delay: 1.2s; }
        @keyframes mePulse { 0% { transform: translate(-50%,-50%) scale(1); opacity: 0.7; } 100% { transform: translate(-50%,-50%) scale(6); opacity: 0; } }
        .map-pin { transition: transform 0.18s ease; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)); }
        .map-pin:hover { transform: translate(-50%, -100%) scale(1.1) !important; }
        .pin-label { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); padding: 3px 8px; background: rgba(15,15,20,0.95); border: 1px solid var(--accent); border-radius: 6px; font-size: 10.5px; font-weight: 600; white-space: nowrap; color: var(--fg-0); }
        .map-ctrl { width: 32px; height: 32px; border-radius: 8px; background: rgba(15,15,20,0.85); backdrop-filter: blur(12px); border: 1px solid var(--line-1); color: var(--fg-1); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .map-ctrl:hover { background: var(--bg-2); }
      `}</style>
    </div>
  )
}

function AgentDetail({ agent }: { agent: Agent }) {
  return (
    <div style={{ borderTop: '1px solid var(--line-1)', background: 'var(--bg-0)', padding: '18px 24px' }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, color: '#0a0a0c', flexShrink: 0 }}>
          {agent.name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div className="row" style={{ marginBottom: 4 }}>
            <h2 style={{ fontSize: 17, margin: 0, letterSpacing: '-0.015em' }}>{agent.name}</h2>
            <span className="tag" style={{ background: agent.open ? 'rgba(95,225,196,0.15)' : 'var(--bg-2)', color: agent.open ? 'var(--success)' : 'var(--fg-3)' }}>
              {agent.open ? '● Open' : 'Closed'}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginBottom: 10 }}>{agent.addr} · {agent.dist} away</div>
          <div className="row" style={{ gap: 18, fontSize: 12, flexWrap: 'wrap' }}>
            <span className="row" style={{ gap: 4 }}><Icon.clock /> <span style={{ color: 'var(--fg-2)' }}>{agent.hours}</span></span>
            <span className="row" style={{ gap: 4 }}>★ <span style={{ color: 'var(--fg-2)' }}>{agent.rating} · {agent.reviews} reviews</span></span>
            <span className="row" style={{ gap: 4 }}>💵 <span style={{ color: 'var(--fg-2)' }}>Fee {agent.fee}</span></span>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost"><Icon.copy /> Share</button>
          <button className="btn btn-outline"><Icon.external /> Directions</button>
          <button className="btn btn-accent">Reserve cash-out</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page: Verify identity (KYC) — frontend-only multi-step demo
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_CODES: Array<{ code: string; flag: string; name: string }> = [
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+82',  flag: '🇰🇷', name: 'South Korea' },
]

function KYCFlow() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dialCode, setDialCode] = useState('+977')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
  const [docType, setDocType] = useState<'passport' | 'drivers' | 'national'>('passport')
  const [country, setCountry] = useState('US')
  const [verifying, setVerifying] = useState(false)
  const steps = ['Phone', 'Identity', 'Document', 'Selfie', 'Review']
  const goNext = () => setStep((s) => Math.min(s + 1, 5))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))
  const fullPhone = `${dialCode} ${phone}`.trim()

  return (
    <div className="content-narrow" style={{ paddingTop: 28 }}>
      <div className="row" style={{ marginBottom: 20, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="col" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 8, color: 'var(--fg-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <Icon.shield /> Identity verification
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-2)' }}>Required for card payments and sends over $1,000. Takes about 2 minutes.</div>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ padding: '6px 12px', fontSize: 12 }}>Skip for now</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <DesignStepper steps={steps} current={Math.min(step, 4)} />
      </div>

      {step === 0 && (
        <KYCPhone
          phone={phone}
          setPhone={setPhone}
          dialCode={dialCode}
          setDialCode={setDialCode}
          onNext={() => {
            // Combine dial code + local digits when advancing past the phone step.
            // (Demo only — no backend yet; stored in state and shown on the OTP screen.)
            // eslint-disable-next-line no-console
            console.info('KYC submit phone:', fullPhone)
            goNext()
          }}
        />
      )}
      {step === 1 && <KYCOtp otp={otp} setOtp={setOtp} fullPhone={fullPhone} onNext={goNext} onBack={goBack} />}
      {step === 2 && <KYCIdentity docType={docType} setDocType={setDocType} country={country} setCountry={setCountry} onNext={goNext} onBack={goBack} />}
      {step === 3 && <KYCDocument docType={docType} onNext={goNext} onBack={goBack} />}
      {step === 4 && (
        <KYCSelfie
          onNext={() => {
            setVerifying(true)
            setTimeout(() => {
              setVerifying(false)
              goNext()
            }, 2400)
          }}
          onBack={goBack}
          verifying={verifying}
        />
      )}
      {step === 5 && <KYCDone />}
    </div>
  )
}

function DesignStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <span key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div className={`step ${i < current ? 'done' : i === current ? 'active' : ''}`}>
            <div className="step-num">{i < current ? <Icon.check /> : i + 1}</div>
            <div>{s}</div>
          </div>
          {i < steps.length - 1 && <div className="step-line" style={{ background: i < current ? 'var(--accent-2)' : '' }} />}
        </span>
      ))}
    </div>
  )
}

function KYCPhone({
  phone,
  setPhone,
  dialCode,
  setDialCode,
  onNext,
}: {
  phone: string
  setPhone: (s: string) => void
  dialCode: string
  setDialCode: (s: string) => void
  onNext: () => void
}) {
  const selected = COUNTRY_CODES.find((c) => c.code === dialCode) ?? COUNTRY_CODES[0]
  return (
    <div className="flow-panel">
      <div>
        <h2>Let's verify your phone</h2>
        <div className="subtitle">We'll text you a 6-digit code. This number is only used for security alerts.</div>
      </div>
      <div className="field">
        <div className="field-label">Mobile number</div>
        <div className="row" style={{ gap: 8 }}>
          <label
            className="input"
            style={{
              width: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 12px',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <span aria-hidden="true">{selected.flag}</span>
            <span className="mono">{selected.code}</span>
            <Icon.arrowDown style={{ marginLeft: 2, opacity: 0.7 }} />
            <select
              value={dialCode}
              onChange={(e) => setDialCode(e.target.value)}
              aria-label="Country code"
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} {c.name}
                </option>
              ))}
            </select>
          </label>
          <input
            className="input"
            placeholder={dialCode === '+977' ? '98 4123 4567' : 'Phone number'}
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      <div className="card" style={{ background: 'var(--bg-2)', padding: '12px 14px' }}>
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <Icon.lock style={{ color: 'var(--fg-2)', marginTop: 2 }} />
          <div style={{ fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.5 }}>
            ChainRemit follows Nepal Rastra Bank guidelines for cross-border remittance. Your data is encrypted at rest and never sold.
          </div>
        </div>
      </div>
      <button className="btn btn-accent btn-lg btn-block" disabled={phone.length < 7} onClick={onNext}>
        Send code <Icon.arrowRight />
      </button>
    </div>
  )
}

function KYCOtp({ otp, setOtp, fullPhone, onNext, onBack }: { otp: string[]; setOtp: (v: string[]) => void; fullPhone: string; onNext: () => void; onBack: () => void }) {
  const filled = otp.filter((d) => d).length
  useEffect(() => {
    if (filled === 6) setTimeout(onNext, 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled])
  const tap = (digit: string) => {
    const idx = otp.findIndex((d) => !d)
    if (idx === -1) return
    const next = [...otp]
    next[idx] = digit
    setOtp(next)
  }
  const back = () => {
    const last = [...otp].reverse().findIndex((d) => d)
    if (last === -1) return
    const idx = otp.length - 1 - last
    const next = [...otp]
    next[idx] = ''
    setOtp(next)
  }
  return (
    <div className="flow-panel">
      <div>
        <h2>Enter the code</h2>
        <div className="subtitle">
          Sent to <span className="mono">{fullPhone || '+977 98 4123 4567'}</span> · <span style={{ color: 'var(--accent-2)', cursor: 'pointer' }}>Resend</span>
        </div>
      </div>
      <div className="otp-grid">
        {otp.map((d, i) => (
          <div key={i} className={`otp-box ${d ? 'filled' : i === filled ? 'cursor' : ''}`}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxWidth: 280, margin: '0 auto' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
          <button
            key={i}
            disabled={!d}
            onClick={() => (d === '⌫' ? back() : tap(d))}
            style={{
              padding: '14px 0',
              borderRadius: 12,
              background: d ? 'var(--bg-2)' : 'transparent',
              border: '1px solid var(--line-1)',
              color: 'var(--fg-0)',
              fontSize: 18,
              fontFamily: 'var(--font-mono)',
              cursor: d ? 'pointer' : 'default',
              opacity: d ? 1 : 0,
            }}
          >
            {d}
          </button>
        ))}
      </div>
      <button className="btn btn-ghost" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <Icon.arrowLeft /> Back
      </button>
    </div>
  )
}

function KYCIdentity({
  docType,
  setDocType,
  country,
  setCountry,
  onNext,
  onBack,
}: {
  docType: 'passport' | 'drivers' | 'national'
  setDocType: (v: 'passport' | 'drivers' | 'national') => void
  country: string
  setCountry: (v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const docs: Array<{ k: 'passport' | 'drivers' | 'national'; label: string; sub: string; icon: string }> = [
    { k: 'passport', label: 'Passport', sub: 'Photo page', icon: '🛂' },
    { k: 'drivers', label: "Driver's license", sub: 'Front + back', icon: '🪪' },
    { k: 'national', label: 'National ID', sub: 'Government issued', icon: '🆔' },
  ]
  return (
    <div className="flow-panel">
      <div>
        <h2>Pick a document</h2>
        <div className="subtitle">One government ID gets you up to $10,000/month in sends.</div>
      </div>
      <div className="field">
        <div className="field-label">Country of issue</div>
        <select className="input" value={country} onChange={(e) => setCountry(e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
          <option value="US">🇺🇸 United States</option>
          <option value="GB">🇬🇧 United Kingdom</option>
          <option value="AE">🇦🇪 United Arab Emirates</option>
          <option value="QA">🇶🇦 Qatar</option>
          <option value="MY">🇲🇾 Malaysia</option>
          <option value="AU">🇦🇺 Australia</option>
          <option value="SG">🇸🇬 Singapore</option>
        </select>
      </div>
      <div className="field">
        <div className="field-label">Document type</div>
        <div className="col" style={{ gap: 8 }}>
          {docs.map((d) => (
            <div key={d.k} className={`recipient-card ${docType === d.k ? 'selected' : ''}`} onClick={() => setDocType(d.k)} style={{ padding: 14 }}>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 18, background: 'var(--bg-3)' }}>{d.icon}</div>
              <div className="col" style={{ gap: 2 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{d.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{d.sub}</div>
              </div>
              <div className="spacer" />
              <Radio selected={docType === d.k} />
            </div>
          ))}
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack}><Icon.arrowLeft /> Back</button>
        <button className="btn btn-accent" style={{ flex: 1 }} onClick={onNext}>Continue <Icon.arrowRight /></button>
      </div>
    </div>
  )
}

function KYCDocument({ docType, onNext, onBack }: { docType: 'passport' | 'drivers' | 'national'; onNext: () => void; onBack: () => void }) {
  const [uploaded, setUploaded] = useState(false)
  const [scanning, setScanning] = useState(false)
  const docName: Record<typeof docType, string> = { passport: 'Passport photo page', drivers: "Driver's license front", national: 'National ID front' }
  const upload = () => {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      setUploaded(true)
    }, 1400)
  }
  return (
    <div className="flow-panel">
      <div>
        <h2>Upload your {docName[docType].toLowerCase()}</h2>
        <div className="subtitle">Make sure all four corners are visible and text is sharp.</div>
      </div>
      <div
        style={{
          border: '2px dashed ' + (uploaded ? 'var(--accent-2)' : 'var(--line-2)'),
          borderRadius: 'var(--r-3)',
          padding: 28,
          background: 'var(--bg-2)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          transition: 'border-color 200ms',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            aspectRatio: '1.586 / 1',
            borderRadius: 12,
            background: uploaded
              ? 'linear-gradient(135deg, #1a3a4a 0%, #243a52 100%)'
              : 'repeating-linear-gradient(45deg, var(--bg-3), var(--bg-3) 8px, var(--bg-2) 8px, var(--bg-2) 16px)',
            border: '1px solid var(--line-2)',
            padding: 14,
            color: '#cfe7d8',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {uploaded && (
            <>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(207,231,216,0.7)' }}>
                <span>UNITED STATES OF AMERICA</span>
                <span>PASSPORT</span>
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
                <div style={{ width: 50, height: 60, borderRadius: 4, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
                <div className="col" style={{ gap: 3, fontSize: 9, fontFamily: 'var(--font-mono)' }}>
                  <div style={{ opacity: 0.6 }}>SURNAME</div>
                  <div style={{ fontSize: 11, color: '#fff' }}>SHRESTHA</div>
                  <div style={{ opacity: 0.6, marginTop: 4 }}>GIVEN NAMES</div>
                  <div style={{ fontSize: 11, color: '#fff' }}>AARAV</div>
                </div>
              </div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)' }}>
                P&lt;USASHRESTHA&lt;&lt;AARAV&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
              </div>
            </>
          )}
          {scanning && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent-2), transparent)',
                animation: 'kyc-scan 1.4s linear infinite',
              }}
            />
          )}
        </div>
        {!uploaded && !scanning && (
          <button className="btn btn-primary" onClick={upload} style={{ marginTop: 8 }}>
            <Icon.upload /> Upload or take photo
          </button>
        )}
        {scanning && (
          <div className="row" style={{ gap: 8, fontSize: 12, color: 'var(--fg-2)', marginTop: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)' }} />
            Reading document with OCR…
          </div>
        )}
        {uploaded && (
          <div className="row" style={{ gap: 6, fontSize: 12, color: 'var(--accent-2)', marginTop: 6 }}>
            <Icon.check /> Looks great. Name + DOB extracted.
          </div>
        )}
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack}><Icon.arrowLeft /> Back</button>
        <button className="btn btn-accent" style={{ flex: 1 }} disabled={!uploaded} onClick={onNext}>
          Continue <Icon.arrowRight />
        </button>
      </div>
      <style>{`@keyframes kyc-scan { 0% { top: 12%; } 50% { top: 80%; } 100% { top: 12%; } }`}</style>
    </div>
  )
}

function KYCSelfie({ onNext, onBack, verifying }: { onNext: () => void; onBack: () => void; verifying: boolean }) {
  const [captured, setCaptured] = useState(false)
  const [pose, setPose] = useState(0)
  useEffect(() => {
    if (!captured) return
    if (pose < 3) {
      const id = setTimeout(() => setPose((p) => p + 1), 700)
      return () => clearTimeout(id)
    }
  }, [captured, pose])

  if (verifying) {
    return (
      <div className="flow-panel" style={{ alignItems: 'center', textAlign: 'center', padding: 48 }}>
        <div style={{ width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <defs>
              <linearGradient id="kg" x1="0" x2="1">
                <stop offset="0" stopColor="var(--accent)" />
                <stop offset="1" stopColor="var(--accent-2)" />
              </linearGradient>
            </defs>
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--line-1)" strokeWidth="3" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#kg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="60 200" transform="rotate(-90 40 40)">
              <animateTransform attributeName="transform" type="rotate" values="-90 40 40;270 40 40" dur="1.2s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
        <h2>Matching your face to ID…</h2>
        <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Liveness check · Face matching · Sanctions screening</div>
      </div>
    )
  }

  const prompts = ['Look straight ahead', 'Slowly turn left', 'Slowly turn right', 'Perfect, hold still']
  return (
    <div className="flow-panel">
      <div>
        <h2>Quick selfie</h2>
        <div className="subtitle">Liveness check — we make sure it's really you. No photo of a photo.</div>
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 280,
          aspectRatio: '1',
          margin: '0 auto',
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 30%, #1a1f1c, #0a0a0c)',
          border: '2px solid ' + (captured ? 'var(--accent-2)' : 'var(--line-2)'),
        }}
      >
        <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="face" cx="50%" cy="40%" r="50%">
              <stop offset="0" stopColor="#5a4a3e" />
              <stop offset="1" stopColor="#2a1f18" />
            </radialGradient>
          </defs>
          <ellipse
            cx="100"
            cy="115"
            rx="48"
            ry="60"
            fill="url(#face)"
            transform={`rotate(${pose === 1 ? -8 : pose === 2 ? 8 : 0} 100 115)`}
            style={{ transition: 'transform 500ms' }}
          />
          <path d="M 52 95 Q 100 50, 148 95 L 145 80 Q 100 35, 55 80 Z" fill="#1a0f08" />
          <ellipse cx="84" cy="105" rx="4" ry="2.5" fill="#1a1410" />
          <ellipse cx="116" cy="105" rx="4" ry="2.5" fill="#1a1410" />
          <path d="M 88 145 Q 100 152, 112 145" stroke="#3a2418" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="var(--accent-2)"
            strokeWidth="0.8"
            strokeDasharray={`${captured ? (pose + 1) * 75 : 0} 1000`}
            style={{ transition: 'stroke-dasharray 600ms' }}
          />
        </svg>
        <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'var(--fg-1)', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          {captured ? prompts[pose] : 'Center your face'}
        </div>
      </div>
      <div className="card" style={{ background: 'var(--bg-2)', padding: '12px 14px' }}>
        <div className="col" style={{ gap: 6, fontSize: 11.5 }}>
          {([
            ['Lighting', captured],
            ['Face centered', captured],
            ['Liveness', captured && pose >= 2],
          ] as Array<[string, boolean]>).map(([k, ok]) => (
            <div key={k} className="row" style={{ gap: 8, color: ok ? 'var(--accent-2)' : 'var(--fg-3)' }}>
              {ok ? <Icon.check /> : <span style={{ width: 12, height: 12, border: '1px solid currentColor', borderRadius: '50%' }} />}
              {k}
            </div>
          ))}
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack}><Icon.arrowLeft /> Back</button>
        {!captured && (
          <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => setCaptured(true)}>
            Start liveness check
          </button>
        )}
        {captured && (
          <button className="btn btn-accent" style={{ flex: 1 }} disabled={pose < 3} onClick={onNext}>
            {pose < 3 ? 'Hold on…' : 'Submit for verification'}
          </button>
        )}
      </div>
    </div>
  )
}

function KYCDone() {
  const navigate = useNavigate()
  return (
    <div className="flow-panel" style={{ maxWidth: 480 }}>
      <div className="col" style={{ alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <div className="success-glyph"><Icon.check style={{ width: 28, height: 28 }} /></div>
        <h2>You're verified</h2>
        <div className="subtitle">
          Your account now supports card payments and sends up to{' '}
          <span className="mono" style={{ color: 'var(--fg-1)' }}>$10,000/month</span>. Welcome to ChainRemit, Aarav.
        </div>
      </div>
      <div className="card" style={{ padding: 0, background: 'var(--bg-2)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-1)' }}>
          <div className="card-title">Verification summary</div>
        </div>
        <div style={{ padding: '8px 18px' }}>
          <div className="review-row"><span className="k">Phone</span><span className="v" style={{ color: 'var(--accent-2)' }}>Verified</span></div>
          <div className="review-row"><span className="k">Document</span><span className="v">Passport · USA</span></div>
          <div className="review-row"><span className="k">Liveness</span><span className="v" style={{ color: 'var(--accent-2)' }}>Match 98.4%</span></div>
          <div className="review-row"><span className="k">Sanctions</span><span className="v" style={{ color: 'var(--accent-2)' }}>Clear</span></div>
          <div className="review-row total">
            <span className="k">Tier</span>
            <span className="v" style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Verified · Tier 2
            </span>
          </div>
        </div>
      </div>
      <button className="btn btn-primary btn-block" onClick={() => navigate('/')}>Continue to dashboard</button>
      <button className="btn btn-ghost btn-block" onClick={() => navigate('/send')}>Send your first transfer</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page: Settings (frontend-only display)
// ─────────────────────────────────────────────────────────────────────────────

function Settings() {
  const wallet = useWallet()
  const [toggles, setToggles] = useState({ biometric: true, autoCancel: true, emailNotify: false })
  const t = (k: keyof typeof toggles) => setToggles((s) => ({ ...s, [k]: !s[k] }))
  return (
    <div className="content-narrow">
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
        <div className="page-sub">Wallet, security, and notification preferences.</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>Connected wallet</div>
        <div className="row" style={{ gap: 12 }}>
          <div className="avatar cool" style={{ width: 44, height: 44 }}>P</div>
          <div className="col" style={{ gap: 2 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{wallet.connected ? 'Phantom' : 'No wallet connected'}</div>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>
              {wallet.publicKey ? shortAddr(wallet.publicKey.toBase58(), 8, 8) : '—'}
            </div>
          </div>
          <div className="spacer" />
          {wallet.connected ? (
            <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={() => wallet.disconnect()}>Disconnect</button>
          ) : (
            <span className="muted" style={{ fontSize: 12 }}>Connect from the top bar</span>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>Security</div>
        <div className="col" style={{ gap: 0 }}>
          {([
            ['Require biometric for sends > $200', 'biometric'],
            ['Auto-cancel unclaimed escrow after 14 days', 'autoCancel'],
            ['Notify by email on every confirmation', 'emailNotify'],
          ] as Array<[string, keyof typeof toggles]>).map(([label, key], i) => (
            <div key={key} className="row" style={{ padding: '12px 0', borderTop: i ? '1px solid var(--line-1)' : 'none', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{label}</span>
              <button
                onClick={() => t(key)}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 999,
                  background: toggles[key] ? 'var(--accent-grad)' : 'var(--bg-3)',
                  position: 'relative',
                  cursor: 'pointer',
                  border: 'none',
                  padding: 0,
                }}
                aria-label={label}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: toggles[key] ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 160ms ease',
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Network</div>
        <div className="col" style={{ gap: 8, fontSize: 13 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">RPC endpoint</span>
            <span className="mono">api.devnet.solana.com</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">Escrow program</span>
            <span className="mono">{shortAddr(PROGRAM_ID.toBase58(), 6, 6)}</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">Relayer</span>
            <span className="mono">localhost:8787</span>
          </div>
        </div>
      </div>
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
  '/agent': ['Agent locator', 'Tools'],
  '/agent/console': ['Agent console', 'Tools'],
  '/kyc': ['Verify identity', 'Account'],
  '/settings': ['Settings', 'Account'],
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
        <Route path="/agent" element={<ShelledRoute><AgentLocator /></ShelledRoute>} />
        <Route path="/agent/console" element={<ShelledRoute><AgentConsole /></ShelledRoute>} />
        <Route path="/kyc" element={<ShelledRoute><KYCFlow /></ShelledRoute>} />
        <Route path="/settings" element={<ShelledRoute><Settings /></ShelledRoute>} />
        <Route path="*" element={<ShelledRoute><Dashboard /></ShelledRoute>} />
      </Routes>
    </FxRateProvider>
  )
}

export default App
