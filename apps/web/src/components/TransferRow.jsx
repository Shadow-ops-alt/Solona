import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from './Card'
import StatusPill from './StatusPill'

function TransferRow({ transfer, view = 'sent' }) {
  const [expanded, setExpanded] = useState(false)
  const actorLabel = view === 'sent' ? 'Recipient' : 'Sender'
  const actorName = view === 'sent' ? transfer.recipient : transfer.counterparty
  const isSent = view === 'sent'

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          background: '#fff',
          border: '1px solid var(--outline-dim)',
          borderRadius: expanded ? '12px 12px 0 0' : 12,
          color: 'inherit',
          padding: '16px 20px',
          textAlign: 'left',
          display: 'grid',
          gridTemplateColumns: '40px 1fr auto',
          gap: 14,
          cursor: 'pointer',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
          transition: 'box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: isSent ? 'var(--primary-soft)' : 'var(--green-soft)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {transfer.recipientFlag}
        </div>

        {/* Middle: name + context */}
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--on-surface)' }}>
            {actorName}
          </span>
          <span style={{ fontSize: 13, color: 'var(--on-surface-muted)' }}>
            {transfer.phone} · {transfer.date}
          </span>
        </div>

        {/* Right: amount + status */}
        <div style={{ display: 'grid', gap: 4, justifyItems: 'end', flexShrink: 0 }}>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 15,
              fontWeight: 500,
              color: isSent ? 'var(--on-surface)' : 'var(--green)',
            }}
          >
            {isSent ? '−' : '+'}
            {transfer.amountUSDC} USDC
          </span>
          <StatusPill status={transfer.status} />
        </div>
      </button>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                background: 'var(--bg-low)',
                border: '1px solid var(--outline-dim)',
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                padding: '16px 20px',
                display: 'grid',
                gap: 10,
              }}
            >
              <ExpandRow label={actorLabel} value={actorName} />
              <ExpandRow
                label="NPR equivalent"
                value={`NPR ${transfer.amountNPR.toLocaleString()}`}
                highlight
              />
              <ExpandRow label="Pyth rate" value={`1 USD = ${transfer.pythRate} NPR`} />
              <ExpandRow label="Escrow PDA" value={transfer.escrowPDA} mono />
              <ExpandRow label="Claim status" value={transfer.claimStatus} capitalize />
              <ExpandRow label="Settled at" value={transfer.settledAt} />
              <a
                href="#"
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                View on Solana Explorer ↗
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function ExpandRow({ label, value, mono, highlight, capitalize }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--on-surface-muted)', flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
          fontSize: 13,
          fontWeight: 500,
          color: highlight ? 'var(--green)' : 'var(--on-surface)',
          textTransform: capitalize ? 'capitalize' : undefined,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  )
}

export default TransferRow
