import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../components/Button'
import Card from '../components/Card'
import SolanaLogo from '../components/SolanaLogo'
import StatusPill from '../components/StatusPill'
import { useRole } from '../context/RoleContext'

function TransactionDonePage() {
  const { isSender } = useRole()

  const details = [
    { label: 'Escrow PDA', value: '7xKp...mN3q' },
    { label: 'Amount Locked', value: '200 USDC' },
    { label: 'Recipient Gets', value: '≈ NPR 26,840' },
    { label: 'Network', value: 'Solana Devnet' },
  ]

  return (
    <section style={{ maxWidth: 520, margin: '0 auto', display: 'grid', gap: 24 }}>
      <Card style={{ border: '1px solid rgba(5, 150, 105, 0.2)', background: 'var(--green-soft)', padding: 40 }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 16, textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            style={{
               width: 80, height: 80,
               background: '#fff',
               borderRadius: '50%',
               display: 'grid',
               placeItems: 'center',
               boxShadow: '0 8px 24px rgba(5, 150, 105, 0.15)'
            }}
          >
            <SolanaLogo size={40} color="var(--green)" />
          </motion.div>

          <div style={{ marginTop: 8 }}>
             <p style={{ fontWeight: 700, color: 'var(--green)', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
               Transaction Complete
             </p>
             <h2 style={{ fontSize: 32, marginTop: 8, color: '#000', letterSpacing: '-0.02em' }}>Funds Locked</h2>
          </div>

          <p style={{ fontSize: 15, color: 'var(--on-surface-muted)', maxWidth: 360, lineHeight: 1.6 }}>
            {isSender
              ? 'Your recipient can now claim the payout securely with their phone number. No wallet required.'
              : 'Your transfer status is confirmed and ready for payout tracking.'}
          </p>

          <div style={{ marginTop: 8 }}>
            <StatusPill status="confirmed" />
          </div>
        </div>
      </Card>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card style={{ background: 'var(--surface-high)', padding: 24 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            {details.map((item, index) => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--on-surface-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', fontFamily: index === 0 ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }}>
                    {item.value}
                  </span>
                </div>
                {index < details.length - 1 && (
                   <div style={{ height: 1, background: 'var(--outline-dim)', marginTop: 16 }} />
                )}
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.4 }}
         style={{ display: 'grid', gap: 12, marginTop: 8 }}
      >
        <Link to="/send">
          <Button fullWidth>Send Another Transfer</Button>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
           <Link to={isSender ? '/dashboard?view=sent' : '/dashboard?view=received'} style={{ flex: 1 }}>
             <Button variant="ghost" fullWidth style={{ background: '#fff' }}>
               Dashboard
             </Button>
           </Link>
           <Button variant="ghost" style={{ flex: 1, background: '#fff', borderColor: 'var(--green)', color: 'var(--green)' }}>
             {isSender ? 'Share Link' : 'Track'}
           </Button>
        </div>
      </motion.div>
    </section>
  )
}

export default TransactionDonePage
