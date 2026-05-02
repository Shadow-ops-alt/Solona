import { clusterApiUrl, Keypair } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {
  mplBubblegum,
  mintToCollectionV1,
  parseLeafFromMintToCollectionV1Transaction,
} from '@metaplex-foundation/mpl-bubblegum'
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  publicKey,
  type PublicKey,
} from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'

function parseRelayerKeypair() {
  const raw = process.env.RELAYER_PRIVATE_KEY
  if (!raw) return null

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
  const kp = Keypair.fromSecretKey(secret)
  return kp.secretKey
}

export async function mintReceiptNft(recipientWallet: string, amount: string, currency: string) {
  const treeAddress = process.env.MERKLE_TREE_ADDRESS
  const collectionMint = process.env.COLLECTION_MINT

  if (!treeAddress || !collectionMint) {
    // eslint-disable-next-line no-console
    console.warn('MERKLE_TREE_ADDRESS or COLLECTION_MINT not set; skipping receipt NFT mint')
    return null
  }

  const relayerSecretKey = parseRelayerKeypair()
  if (!relayerSecretKey) {
    // eslint-disable-next-line no-console
    console.warn('RELAYER_PRIVATE_KEY not set; skipping receipt NFT mint')
    return null
  }

  const umi = createUmi(process.env.SOLANA_RPC_URL ?? clusterApiUrl('devnet')).use(mplBubblegum())
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(relayerSecretKey)
  const signer = createSignerFromKeypair(umi, umiKeypair)
  umi.use(keypairIdentity(umiKeypair))
  umi.payer = signer
  const receiptNonce = generateSigner(umi)
  const attributes = [
    { trait_type: 'Amount', value: amount },
    { trait_type: 'Currency', value: currency },
    { trait_type: 'Provider', value: 'ChainRemit' },
  ]

  const txResult = await mintToCollectionV1(umi, {
    leafOwner: publicKey(recipientWallet),
    merkleTree: publicKey(treeAddress),
    collectionMint: publicKey(collectionMint),
    metadata: {
      name: 'ChainRemit Receipt',
      symbol: 'CRMIT',
      uri: 'https://chainremit.app/nft-metadata.json',
      sellerFeeBasisPoints: 0,
      creators: [
        {
          address: signer.publicKey as PublicKey,
          verified: true,
          share: 100,
        },
      ],
      collection: null,
      tokenProgramVersion: 0,
    },
  }).sendAndConfirm(umi)

  try {
    await parseLeafFromMintToCollectionV1Transaction(umi, txResult.signature)
  } catch {
    // Leaf parsing is best-effort only; signature is still useful for explorer.
  }

  // eslint-disable-next-line no-console
  console.info('Minted ChainRemit receipt cNFT', { recipientWallet, attributes, receiptNonce: receiptNonce.publicKey })

  return base58.deserialize(txResult.signature)[0]
}
