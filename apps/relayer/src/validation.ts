import { z } from 'zod'

export const CreateRemittanceSchema = z.object({
  amount: z
    .string()
    .min(1)
    .refine((v) => /^\d+(\.\d+)?$/.test(v), 'amount must be numeric'),
  asset: z.enum(['USDC', 'SOL']),
  paymentSource: z.enum(['FIAT', 'SOLANA_WALLET']).default('FIAT'),
  payoutCurrency: z.string().min(2).max(10).default('NPR'),
  payoutMethod: z.enum(['STABLECOIN', 'MOBILE_MONEY', 'BANK']).default('MOBILE_MONEY'),
  recipientHint: z.string().min(3).max(64).optional(),
  escrowPda: z.string().min(32).max(64).optional(),
  senderPubkey: z.string().min(32).max(64).optional(),
  claimToken: z.string().min(10).optional(),
})

export const ClaimSchema = z.object({
  token: z.string().min(10),
  receiverPubkey: z.string().min(32).max(64).optional(),
})

export const CreateRecurringSchema = CreateRemittanceSchema.extend({
  intervalDays: z.number().positive(),
})

