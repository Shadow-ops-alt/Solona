import crypto from 'node:crypto'

export type Asset = 'USDC' | 'SOL'
export type RemittanceStatus = 'CREATED' | 'CLAIMED' | 'CANCELLED'
export type PaymentSource = 'FIAT' | 'SOLANA_WALLET'

export type Remittance = {
  id: string
  createdAtMs: number
  amount: string
  asset: Asset
  paymentSource: PaymentSource
  payoutCurrency: string
  payoutMethod: 'STABLECOIN' | 'MOBILE_MONEY' | 'BANK'
  recipientHint?: string
  escrowPda?: string
  senderPubkey?: string
  status: RemittanceStatus
  claimToken: string
  claimedAtMs?: number
  cancelledAtMs?: number
  fx?: {
    pair: string
    rate: number
    provider: 'PYTH_MOCK' | 'PYTH_LIVE'
    asOfMs: number
  }
}

export type RecurringSchedule = {
  id: string
  recipientHint: string
  amount: string
  asset: Asset
  payoutCurrency: string
  payoutMethod: 'STABLECOIN' | 'MOBILE_MONEY' | 'BANK'
  intervalDays: number
  nextRunMs: number
  createdAtMs: number
  active: boolean
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

export class RemittanceStore {
  private remittances = new Map<string, Remittance>()
  private claimTokenToId = new Map<string, string>()

  create(input: Omit<Remittance, 'id' | 'createdAtMs' | 'status'>): Remittance {
    const id = randomId('rem')
    const rem: Remittance = {
      id,
      createdAtMs: Date.now(),
      status: 'CREATED',
      ...input,
    }
    this.remittances.set(id, rem)
    this.claimTokenToId.set(rem.claimToken, id)
    return rem
  }

  get(id: string) {
    return this.remittances.get(id) ?? null
  }

  getByClaimToken(token: string) {
    const id = this.claimTokenToId.get(token)
    if (!id) return null
    return this.get(id)
  }

  list() {
    return [...this.remittances.values()].sort((a, b) => b.createdAtMs - a.createdAtMs)
  }

  cancel(id: string) {
    const rem = this.get(id)
    if (!rem) return null
    if (rem.status !== 'CREATED') return rem
    rem.status = 'CANCELLED'
    rem.cancelledAtMs = Date.now()
    return rem
  }

  claim(token: string) {
    const rem = this.getByClaimToken(token)
    if (!rem) return null
    if (rem.status !== 'CREATED') return rem
    rem.status = 'CLAIMED'
    rem.claimedAtMs = Date.now()
    return rem
  }

  agentRelease(id: string) {
    const rem = this.get(id)
    if (!rem) return null
    if (rem.status !== 'CREATED') return rem
    rem.status = 'CLAIMED'
    rem.claimedAtMs = Date.now()
    return rem
  }
}

export class RecurringStore {
  private schedules = new Map<string, RecurringSchedule>()

  create(
    input: Omit<RecurringSchedule, 'id' | 'createdAtMs' | 'active' | 'nextRunMs'>,
  ): RecurringSchedule {
    const id = randomId('rec')
    const now = Date.now()
    const schedule: RecurringSchedule = {
      id,
      createdAtMs: now,
      active: true,
      nextRunMs: now + input.intervalDays * 86400000,
      ...input,
    }
    this.schedules.set(id, schedule)
    return schedule
  }

  list() {
    return [...this.schedules.values()]
      .filter((s) => s.active)
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
  }

  deactivate(id: string) {
    const schedule = this.schedules.get(id) ?? null
    if (!schedule) return null
    schedule.active = false
    return schedule
  }
}

