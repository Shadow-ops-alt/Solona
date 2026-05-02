import { AnchorProvider, Program, Wallet, type Idl } from '@coral-xyz/anchor'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  clusterApiUrl,
} from '@solana/web3.js'

const PROGRAM_ID = new PublicKey('2AeboQZoaSyBoC2YRcVHvL9CYh5embbddQ6pFubCKdoZ')

const ESCROW_IDL: Idl = {
  address: PROGRAM_ID.toBase58(),
  metadata: { name: 'escrow', version: '0.1.0', spec: '0.1.0' },
  instructions: [
    {
      name: 'claimEscrow',
      discriminator: [38, 220, 147, 118, 7, 61, 130, 149],
      accounts: [
        { name: 'receiver', writable: true, signer: true },
        { name: 'sender' },
        { name: 'escrow', writable: true },
        { name: 'systemProgram', address: SystemProgram.programId.toBase58() },
      ],
      args: [{ name: 'claimToken', type: 'bytes' }],
    },
  ],
}

class NodeWallet implements Wallet {
  constructor(readonly payer: Keypair) {}
  get publicKey() {
    return this.payer.publicKey
  }
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.payer)
      return tx as T
    }
    tx.sign([this.payer])
    return tx
  }
  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((tx) => this.signTransaction(tx)))
  }
}

function parseRelayerKeypair() {
  const raw = process.env.RELAYER_PRIVATE_KEY
  if (!raw) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('RELAYER_PRIVATE_KEY must be valid JSON array')
  }
  if (!Array.isArray(parsed)) {
    throw new Error('RELAYER_PRIVATE_KEY must be a JSON array')
  }
  const secret = Uint8Array.from(parsed as number[])
  return Keypair.fromSecretKey(secret)
}

function decodeClaimToken(claimToken: string) {
  const normalized = claimToken.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return [...Buffer.from(padded, 'base64')]
}

export async function releaseFunds(
  escrowPda: string,
  senderPubkey: string,
  receiverPubkey: string,
  claimToken: string,
) {
  const relayerKeypair = parseRelayerKeypair()
  if (!relayerKeypair) {
    // eslint-disable-next-line no-console
    console.warn(
      'DEMO MODE: RELAYER_PRIVATE_KEY not set; skipping on-chain releaseFunds and returning mock signature',
    )
    return 'DEMO_MODE_NO_RELAYER_KEY_SET'
  }

  const connection = new Connection(process.env.SOLANA_RPC_URL ?? clusterApiUrl('devnet'), 'confirmed')
  const wallet = new NodeWallet(relayerKeypair)
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  const program = new Program(ESCROW_IDL, provider)

  return program.methods
    .claimEscrow(decodeClaimToken(claimToken))
    .accounts({
      receiver: new PublicKey(receiverPubkey),
      sender: new PublicKey(senderPubkey),
      escrow: new PublicKey(escrowPda),
      systemProgram: SystemProgram.programId,
    })
    .rpc()
}
