import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import ProgressStepper from '../components/ProgressStepper'
import SolanaLogo from '../components/SolanaLogo'

const statusStages = ['Signing transaction...', 'Broadcasting...', 'Locking in escrow...', 'Confirmed ✓']

function AmountStep({ onNext }) {
  const [currency, setCurrency] = useState('USD')
  const [showFees, setShowFees] = useState(false)

  return (
    <Card style={{ maxWidth: 480, margin: '0 auto', animation: 'fadeUp 0.35s ease both' }}>
      <ProgressStepper steps={['Amount', 'Recipient', 'Confirm']} currentStep={1} />
      <div style={{ display: 'grid', justifyItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 56, fontWeight: 700, color: 'var(--on-surface-muted)' }}>$</span>
          <input
            placeholder="0.00"
            className="focusable"
            style={{
              border: 'none',
              background: 'transparent',
              textAlign: 'center',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 56,
              color: 'var(--on-surface)',
              width: 220,
              outline: 'none',
              letterSpacing: '-0.02em',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, background: 'var(--bg-low)', padding: 4, borderRadius: 12 }}>
          {['USD', 'USDC', 'SOL'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCurrency(item)}
              style={{
                borderRadius: 8,
                border: 'none',
                padding: '8px 20px',
                background: currency === item ? '#fff' : 'transparent',
                color: currency === item ? 'var(--primary)' : 'var(--on-surface-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: currency === item ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div
           style={{
             background: 'var(--green-soft)',
             border: '1px solid rgba(5, 150, 105, 0.15)',
             borderRadius: 8,
             padding: '10px 16px',
             display: 'flex',
             alignItems: 'center',
             gap: 8,
             marginTop: 8
           }}
        >
           <span style={{ fontSize: 16 }}>🇳🇵</span>
           <span style={{ fontWeight: 600, color: 'var(--green)' }}>NPR 26,840</span>
           <span style={{ color: 'var(--green)', opacity: 0.8, fontSize: 14 }}>at recipient</span>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <button
          type="button"
          onClick={() => setShowFees((value) => !value)}
          style={{
             border: 'none',
             background: 'transparent',
             color: 'var(--outline)',
             padding: 0,
             display: 'flex',
             alignItems: 'center',
             gap: 6,
             fontWeight: 600,
             fontSize: 14,
             cursor: 'pointer'
          }}
        >
          {showFees ? 'Hide' : 'Show'} fee breakdown
          <motion.span
            animate={{ rotate: showFees ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ↓
          </motion.span>
        </button>

        <AnimatePresence>
          {showFees && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'grid', gap: 12, marginTop: 16, padding: 16, background: 'var(--bg-low)', borderRadius: 12 }}>
                <FeeRow label="Network fee" value="$0.0008" />
                <FeeRow label="Off-ramp" value="0.50%" />
                <FeeRow label="FX rate" value="1 USD = 134.2 NPR" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--on-surface-muted)', fontWeight: 500 }}>Oracle</span>
                  <span
                    style={{
                      background: 'var(--green-soft)',
                      color: 'var(--green)',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
                    Pyth Live
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="hr" style={{ margin: '24px 0' }} />
      <Button fullWidth onClick={() => onNext()}>
        Continue
      </Button>
    </Card>
  )
}

function RecipientStep({ onNext, onBack }) {
  const [value, setValue] = useState('')
  const [showWallet, setShowWallet] = useState(false)
  const [wallet, setWallet] = useState('')
  const [linkGenerated, setLinkGenerated] = useState(false)

  return (
    <Card style={{ maxWidth: 480, margin: '0 auto', animation: 'fadeUp 0.35s ease both' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--on-surface-muted)',
          padding: '4px 8px 4px 0',
          cursor: 'pointer',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        ← Back
      </button>
      <ProgressStepper steps={['Amount', 'Recipient', 'Confirm']} currentStep={2} />

      <div style={{ display: 'grid', gap: 20 }}>
         <Input
           label="Recipient phone or email"
           leftSlot="🇳🇵 +977"
           value={value}
           onChange={(event) => setValue(event.target.value)}
           placeholder="98XXXXXXXX"
         />

         <button
           type="button"
           onClick={() => setShowWallet((current) => !current)}
           style={{
             border: 'none',
             background: 'transparent',
             color: 'var(--primary)',
             padding: 0,
             cursor: 'pointer',
             fontWeight: 600,
             fontSize: 14,
             textAlign: 'left'
           }}
         >
           Or paste wallet address directly
         </button>

         <AnimatePresence>
           {showWallet && (
             <motion.div
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               style={{ overflow: 'hidden' }}
             >
               <div style={{ paddingTop: 8 }}>
                 <Input
                   label="Wallet address"
                   value={wallet}
                   onChange={(event) => setWallet(event.target.value)}
                   helperText="Use recipient's Solana address; long addresses will truncate in shared link."
                   data-mono
                 />
               </div>
             </motion.div>
           )}
         </AnimatePresence>
      </div>

      {!linkGenerated ? (
        <div style={{ marginTop: 24 }}>
          <Button fullWidth onClick={() => setLinkGenerated(true)}>
            Generate Claim Link
          </Button>
        </div>
      ) : null}

      {linkGenerated ? (
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
        >
          <div style={{ marginTop: 24, padding: 20, background: 'var(--surface-high)', borderRadius: 12, border: '1px solid var(--outline-dim)' }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--on-surface-muted)' }}>Claim link generated</span>
                 <span style={{ fontSize: 20 }}>🔗</span>
              </div>
              <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--outline-dim)' }}>
                 <p className="mono-data" style={{ margin: 0, color: 'var(--primary)', fontWeight: 500, fontSize: 14 }}>chainremit.app/claim/xK9mP...</p>
              </div>

              {/* Simplified visual QR representation for design purposes */}
               <div style={{
                 width: 140, height: 140,
                 background: '#fff',
                 padding: 12,
                 borderRadius: 12,
                 border: '1px solid var(--outline-dim)',
                 display: 'grid',
                 placeItems: 'center',
                 margin: '0 auto',
                 boxShadow: 'var(--shadow-sm)'
               }}>
                  <div style={{
                     width: '100%', height: '100%',
                     backgroundImage: 'radial-gradient(var(--outline) 15%, transparent 15%), radial-gradient(var(--outline) 15%, transparent 15%)',
                     backgroundSize: '12px 12px',
                     backgroundPosition: '0 0, 6px 6px',
                     opacity: 0.4
                  }} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Button variant="ghost" fullWidth style={{ padding: '12px' }}>
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  style={{ borderColor: 'var(--green)', color: 'var(--green)', padding: '12px' }}
                >
                  WhatsApp
                </Button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--on-surface-muted)', textAlign: 'center', margin: 0 }}>
                Recipient logs in with their phone. No crypto wallet needed.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <Button fullWidth onClick={() => onNext()}>
              Lock Funds in Escrow
            </Button>
          </div>
        </motion.div>
      ) : null}
    </Card>
  )
}

function ConfirmStep({ onBack }) {
  const navigate = useNavigate()
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    const timers = [1, 2, 3].map((value) =>
      window.setTimeout(() => setStatusIndex(value), value * 800),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const isConfirmed = statusIndex === statusStages.length - 1

  return (
    <Card style={{ maxWidth: 480, margin: '0 auto', animation: 'fadeUp 0.35s ease both' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--on-surface-muted)',
          padding: '4px 8px 4px 0',
          cursor: 'pointer',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        ← Back
      </button>
      <ProgressStepper steps={['Amount', 'Recipient', 'Confirm']} currentStep={3} />

      <div style={{
         width: '100%',
         background: isConfirmed ? 'var(--green-soft)' : 'var(--surface-high)',
         border: isConfirmed ? '1px solid rgba(5, 150, 105, 0.2)' : '1px solid var(--outline-dim)',
         borderRadius: 12,
         padding: 32,
         transition: 'all 0.4s ease'
      }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 20 }}>
          <div style={{ animation: isConfirmed ? 'none' : 'pulse 1.4s ease infinite' }}>
            <SolanaLogo size={48} color={isConfirmed ? 'var(--green)' : 'var(--primary)'} />
          </div>
          <div style={{ height: 24, position: 'relative', width: '100%', textAlign: 'center' }}>
             <AnimatePresence mode="wait">
                <motion.span
                  key={statusIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                     display: 'inline-block',
                     fontWeight: 600,
                     fontSize: 16,
                     color: isConfirmed ? 'var(--green)' : 'var(--on-surface)',
                     position: 'absolute',
                     left: 0, right: 0
                  }}
                >
                  {statusStages[statusIndex]}
                </motion.span>
             </AnimatePresence>
          </div>
        </div>
      </div>

      {isConfirmed ? (
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
        >
           <div style={{ marginTop: 24, background: 'var(--surface-high)', padding: 20, borderRadius: 12, display: 'grid', gap: 12 }}>
            <DetailRow label="Escrow PDA" value="7xKp...mN3q" mono />
            <DetailRow label="Amount locked" value="200 USDC" />
            <DetailRow label="FX rate (Pyth)" value="1 USD = 134.2 NPR" />
            <div style={{ height: 1, background: 'var(--outline-dim)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>Recipient gets</span>
               <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: 18 }}>≈ NPR 26,840</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--on-surface-muted)' }}>Solana TX</span>
              <a href="#" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                Explorer ↗
              </a>
            </div>
          </div>
        </motion.div>
      ) : null}

      <p style={{ fontSize: 14, color: 'var(--on-surface-muted)', textAlign: 'center', marginTop: 24, padding: '0 16px' }}>
        Funds are locked on-chain. Only your recipient can release them.
      </p>

      {isConfirmed ? (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.3 }}
           style={{ display: 'grid', gap: 12, marginTop: 24 }}
        >
          <Button fullWidth onClick={() => navigate('/send/done')}>
            View Transaction Receipt
          </Button>
          <Link to="/send">
            <Button variant="ghost" fullWidth>
              Send Another Transfer
            </Button>
          </Link>
        </motion.div>
      ) : null}
    </Card>
  )
}

function FeeRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 14, color: 'var(--on-surface-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>{value}</span>
    </div>
  )
}

function DetailRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 14, color: 'var(--on-surface-muted)' }}>{label}</span>
      <span style={{
         fontSize: 14,
         fontWeight: 600,
         color: 'var(--on-surface)',
         fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'
      }}>
         {value}
      </span>
    </div>
  )
}

function SendFlow({ step: propStep = 1 }) {
  const [step, setStep] = useState(propStep)

  return (
    <div style={{ paddingBottom: 40 }}>
      {step === 1 ? (
        <AmountStep onNext={() => setStep(2)} />
      ) : step === 2 ? (
        <RecipientStep onNext={() => setStep(3)} onBack={() => setStep(1)} />
      ) : (
        <ConfirmStep onBack={() => setStep(2)} />
      )}
    </div>
  )
}

export default SendFlow
