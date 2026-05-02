import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import type { Request } from 'express'
import { RecurringStore, RemittanceStore } from './store.js'
import { ClaimSchema, CreateRecurringSchema, CreateRemittanceSchema } from './validation.js'
import { releaseFunds } from './solana.js'
import { mintReceiptNft } from './nft.js'

const PORT = Number(process.env.PORT ?? 8787)
const WEB_BASE_URL = (process.env.WEB_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const SESSION_COOKIE = 'chainremit_agent_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const AUTH_WINDOW_MS = 15 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5
const MAX_RELEASE_ATTEMPTS = 30
const app = express()
const store = new RemittanceStore()
const recurringStore = new RecurringStore()
const sessions = new Map<string, { expiresAtMs: number; createdAtMs: number }>()
const loginAttempts = new Map<string, { count: number; resetAtMs: number }>()
const releaseAttempts = new Map<string, { count: number; resetAtMs: number }>()

app.use(cors({ origin: true }))
app.use(express.json({ limit: '256kb' }))

function cookieValue(req: Request, key: string) {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';')
  for (const item of cookies) {
    const [k, ...rest] = item.trim().split('=')
    if (k !== key) continue
    return decodeURIComponent(rest.join('='))
  }
  return null
}

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function timingSafeEqualString(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function isPinValid(pin: string) {
  const pinHash = process.env.AGENT_PIN_HASH?.trim()
  const pinSalt = process.env.AGENT_PIN_SALT ?? ''
  if (pinHash) {
    return timingSafeEqualString(sha256Hex(`${pinSalt}${pin}`), pinHash)
  }
  const fallbackPin = process.env.AGENT_PIN ?? '1234'
  return timingSafeEqualString(pin, fallbackPin)
}

function attemptAllowed(
  bucket: Map<string, { count: number; resetAtMs: number }>,
  key: string,
  maxAttempts: number,
) {
  const now = Date.now()
  const existing = bucket.get(key)
  if (!existing || existing.resetAtMs <= now) {
    bucket.set(key, { count: 1, resetAtMs: now + AUTH_WINDOW_MS })
    return true
  }
  if (existing.count >= maxAttempts) return false
  existing.count += 1
  return true
}

function clearAttempts(bucket: Map<string, { count: number; resetAtMs: number }>, key: string) {
  bucket.delete(key)
}

function createSession(res: express.Response) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAtMs = Date.now() + SESSION_TTL_MS
  sessions.set(token, { createdAtMs: Date.now(), expiresAtMs })
  const secure = process.env.NODE_ENV === 'production'
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000,
    )}${secure ? '; Secure' : ''}`,
  )
}

function clearSession(res: express.Response, token: string | null) {
  if (token) sessions.delete(token)
  const secure = process.env.NODE_ENV === 'production'
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
  )
}

function requireAgentSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = cookieValue(req, SESSION_COOKIE)
  if (!token) return res.status(401).json({ error: 'unauthorized' })
  const session = sessions.get(token)
  if (!session) return res.status(401).json({ error: 'unauthorized' })
  if (session.expiresAtMs <= Date.now()) {
    sessions.delete(token)
    return res.status(401).json({ error: 'session_expired' })
  }
  next()
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/auth/session', (req, res) => {
  const token = cookieValue(req, SESSION_COOKIE)
  if (!token) return res.json({ authenticated: false })
  const session = sessions.get(token)
  if (!session || session.expiresAtMs <= Date.now()) {
    if (token) sessions.delete(token)
    return res.json({ authenticated: false })
  }
  return res.json({ authenticated: true })
})

app.post('/api/auth/login', (req, res) => {
  const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : ''
  if (pin.length < 4 || pin.length > 32) {
    return res.status(400).json({ error: 'invalid_pin' })
  }
  const key = `${req.ip ?? 'unknown'}:login`
  if (!attemptAllowed(loginAttempts, key, MAX_LOGIN_ATTEMPTS)) {
    return res.status(429).json({ error: 'too_many_attempts' })
  }
  if (!isPinValid(pin)) {
    return res.status(401).json({ error: 'invalid_credentials' })
  }
  clearAttempts(loginAttempts, key)
  createSession(res)
  return res.json({ ok: true })
})

app.post('/api/auth/logout', (req, res) => {
  const token = cookieValue(req, SESSION_COOKIE)
  clearSession(res, token)
  return res.json({ ok: true })
})

// Mock FX quote (fallback)
function mockFx(pair: string) {
  // deterministic-ish for demos: small variation based on current minute
  const minute = Math.floor(Date.now() / 60000)
  const wobble = (minute % 7) * 0.002
  const base = pair === 'SOL/USD' ? 150 : 1
  const rate = Number((base * (1 + wobble)).toFixed(6))
  return { pair, rate, provider: 'PYTH_MOCK' as const, asOfMs: Date.now() }
}

const PYTH_USDC_USD_ID = '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a'
let pythUsdcUsdCache: { fetchedAtMs: number; asOfMs: number; rate: number } | null = null

async function getFx(pair: 'USDC/USD' | 'SOL/USD') {
  if (pair !== 'USDC/USD') return mockFx(pair)

  const now = Date.now()
  if (pythUsdcUsdCache && now - pythUsdcUsdCache.fetchedAtMs < 30_000) {
    return { pair, rate: pythUsdcUsdCache.rate, provider: 'PYTH_LIVE' as const, asOfMs: pythUsdcUsdCache.asOfMs }
  }

  try {
    const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${encodeURIComponent(PYTH_USDC_USD_ID)}`
    const res = await fetch(url)
    const body = (await res.json()) as any
    const parsed0 = body?.parsed?.[0]
    const priceRaw = parsed0?.price?.price
    const expo = parsed0?.price?.expo

    const priceNumber = typeof priceRaw === 'string' ? Number(priceRaw) : Number(priceRaw)
    const expoNumber = Number(expo)
    if (!Number.isFinite(priceNumber) || !Number.isFinite(expoNumber)) {
      throw new Error('Invalid Hermes price payload')
    }

    const rate = priceNumber * Math.pow(10, expoNumber)
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('Invalid Hermes rate computed')
    }

    const asOfMs = now
    pythUsdcUsdCache = { fetchedAtMs: now, asOfMs, rate }
    return { pair, rate, provider: 'PYTH_LIVE' as const, asOfMs }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Pyth Hermes fetch failed; falling back to mockFx', e instanceof Error ? e.message : String(e))
    return mockFx(pair)
  }
}

app.post('/api/remittances', async (req, res) => {
  const parsed = CreateRemittanceSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const fx = await getFx(parsed.data.asset === 'SOL' ? 'SOL/USD' : 'USDC/USD')
  const rem = store.create({
    amount: parsed.data.amount,
    asset: parsed.data.asset,
    paymentSource: parsed.data.paymentSource,
    payoutCurrency: parsed.data.payoutCurrency,
    payoutMethod: parsed.data.payoutMethod,
    recipientHint: parsed.data.recipientHint,
    senderPubkey: parsed.data.senderPubkey,
    escrowPda: parsed.data.escrowPda,
    claimToken: parsed.data.claimToken ?? randomClaimToken(),
    fx,
  })

  res.json({
    remittance: sanitize(rem),
    claimUrl: `${WEB_BASE_URL}/claim#${rem.claimToken}`,
  })
})

app.post('/api/recurring', (req, res) => {
  const parsed = CreateRecurringSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const schedule = recurringStore.create({
    amount: parsed.data.amount,
    asset: parsed.data.asset,
    payoutCurrency: parsed.data.payoutCurrency,
    payoutMethod: parsed.data.payoutMethod,
    recipientHint: parsed.data.recipientHint ?? '',
    intervalDays: parsed.data.intervalDays,
  })

  res.json({ schedule })
})

app.get('/api/recurring', (_req, res) => {
  res.json({ schedules: recurringStore.list() })
})

app.post('/api/recurring/:id/deactivate', (req, res) => {
  const schedule = recurringStore.deactivate(req.params.id)
  if (!schedule) return res.status(404).json({ error: 'not_found' })
  res.json({ schedule })
})

app.get('/api/remittances/:id', (req, res) => {
  const rem = store.get(req.params.id)
  if (!rem) return res.status(404).json({ error: 'not_found' })
  res.json({ remittance: sanitize(rem) })
})

app.get('/api/remittances', (_req, res) => {
  const remittances = store.list().map(sanitize)
  res.json({ remittances })
})

app.get('/api/agent/remittances', requireAgentSession, (_req, res) => {
  const remittances = store
    .list()
    .filter((r) => r.status === 'CREATED')
    .map(sanitize)
  res.json({ remittances })
})

app.post('/api/remittances/:id/cancel', (req, res) => {
  const rem = store.cancel(req.params.id)
  if (!rem) return res.status(404).json({ error: 'not_found' })
  res.json({ remittance: sanitize(rem) })
})

app.post('/api/remittances/:id/agent-release', requireAgentSession, (req, res) => {
  const key = `${req.ip ?? 'unknown'}:release`
  if (!attemptAllowed(releaseAttempts, key, MAX_RELEASE_ATTEMPTS)) {
    return res.status(429).json({ error: 'too_many_attempts' })
  }
  const remittanceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const rem = store.agentRelease(remittanceId)
  if (!rem) return res.status(404).json({ error: 'not_found' })
  clearAttempts(releaseAttempts, key)
  res.json({ remittance: sanitize(rem) })
})

app.post('/api/claim', async (req, res) => {
  const parsed = ClaimSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const existing = store.getByClaimToken(parsed.data.token)
  if (!existing) return res.status(404).json({ error: 'not_found' })
  if (existing.status !== 'CREATED') {
    return res.status(409).json({ error: 'not_claimable', status: existing.status })
  }

  const rem = store.claim(parsed.data.token)
  if (!rem) return res.status(404).json({ error: 'not_found' })
  const receiverPubkey = parsed.data.receiverPubkey ?? rem.senderPubkey ?? 'DEMO_RECEIVER'
  if (rem.paymentSource === 'SOLANA_WALLET' && rem.escrowPda && rem.senderPubkey) {
    await releaseFunds(rem.escrowPda, rem.senderPubkey, receiverPubkey, rem.claimToken).catch((error) => {
      // eslint-disable-next-line no-console
      console.warn(
        'best-effort releaseFunds failed (demo continues anyway)',
        error instanceof Error ? error.message : String(error),
      )
    })
  }

  let nftTx: string | null = null
  if (parsed.data.receiverPubkey) {
    try {
      nftTx = await mintReceiptNft(parsed.data.receiverPubkey, rem.amount, rem.payoutCurrency)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        'best-effort mintReceiptNft failed (demo continues anyway)',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  res.json({
    remittance: sanitize(rem),
    // For the hackathon demo: what would happen next in real flow
    next: rem.payoutMethod === 'STABLECOIN' ? 'SEND_STABLECOIN' : 'OFFRAMP_FIAT',
    nftTx,
  })
})

function sanitize(rem: any) {
  // never return token via normal status endpoints
  const { claimToken, ...rest } = rem
  return rest
}

function randomClaimToken() {
  return crypto.randomBytes(24).toString('base64url')
}

setInterval(async () => {
  const now = Date.now()
  const due = recurringStore.list().filter((s) => s.nextRunMs <= now)
  for (const schedule of due) {
    try {
      const fx = await getFx(schedule.asset === 'SOL' ? 'SOL/USD' : 'USDC/USD')
      store.create({
        amount: schedule.amount,
        asset: schedule.asset,
        paymentSource: 'FIAT',
        payoutCurrency: schedule.payoutCurrency,
        payoutMethod: schedule.payoutMethod,
        recipientHint: schedule.recipientHint,
        senderPubkey: 'DEMO_RECURRING',
        escrowPda: '',
        claimToken: randomClaimToken(),
        fx,
      })
      schedule.nextRunMs = Date.now() + schedule.intervalDays * 86400000
      // eslint-disable-next-line no-console
      console.log(`Auto-created remittance for recurring schedule ${schedule.id}`)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Recurring auto-create failed for ${schedule.id}`, e instanceof Error ? e.message : String(e))
    }
  }
}, 60_000)

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`relayer listening on http://localhost:${PORT}`)
})

