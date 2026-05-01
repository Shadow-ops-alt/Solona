import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
      <div style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 48, fontWeight: 700 }}>$</span>
          <input
            placeholder="0.00"
            className="focusable"
            style={{
              border: 'none',
              background: 'transparent',
              textAlign: 'center',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700,
              fontSize: 48,
              color: 'var(--on-surface)',
              width: 220,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['USD', 'USDC', 'SOL'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCurrency(item)}
              style={{
                borderRadius: 9999,
                border: '1px solid var(--primary)',
                padding: '8px 14px',
                background: currency === item ? 'rgba(124,58,237,0.25)' : 'transparent',
                color: 'var(--primary-light)',
                cursor: 'pointer',
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="mono-label" style={{ color: 'var(--green)' }}>= 0.412 SOL · NPR 26,840 at recipient</p>
      </div>
      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={() => setShowFees((value) => !value)}
          style={{ border: 'none', background: 'transparent', color: 'var(--outline)', padding: 0 }}
          className="mono-label"
        >
          Show fee breakdown {showFees ? '↑' : '↓'}
        </button>
        {showFees ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 12, animation: 'slideDown 0.2s ease both' }}>
            <FeeRow label="Network fee" value="$0.0008" />
            <FeeRow label="Off-ramp" value="0.50%" />
            <FeeRow label="FX rate" value="1 USD = 134.2 NPR" />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="mono-data">Pyth oracle</span>
              <span
                className="mono-label"
                style={{ border: '1px solid var(--green)', color: 'var(--green)', padding: '2px 8px' }}
              >
                Live
              </span>
            </div>
          </div>
        ) : null}
      </div>
      <div className="hr" style={{ margin: '20px 0' }} />
      <Button fullWidth onClick={() => onNext()}>
        Set Amount →
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
        className="mono-label"
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--outline)',
          padding: 0,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        ← Back
      </button>
      <ProgressStepper steps={['Amount', 'Recipient', 'Confirm']} currentStep={2} />
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
        className="mono-label"
        style={{
          marginTop: 12,
          border: 'none',
          background: 'transparent',
          color: 'var(--primary-light)',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        Or paste wallet address
      </button>
      {showWallet ? (
        <div style={{ marginTop: 12, animation: 'slideDown 0.2s ease both' }}>
          <Input
            label="Wallet address"
            value={wallet}
            onChange={(event) => setWallet(event.target.value)}
            helperText="Use recipient's Solana address; long addresses will truncate in shared link."
            data-mono
          />
        </div>
      ) : null}

      {!linkGenerated ? (
        <div style={{ marginTop: 16 }}>
          <Button fullWidth onClick={() => setLinkGenerated(true)}>
            Generate Link →
          </Button>
        </div>
      ) : null}

      {linkGenerated ? (
        <>
          <Card style={{ marginTop: 16, background: 'var(--surface-low)', animation: 'slideDown 0.25s ease both' }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <span className="mono-label muted">Claim link</span>
              <p className="mono-data">chainremit.app/claim/xK9mP...</p>
              <div style={{
                width: 120, height: 120,
                background: 'white',
                padding: 8,
                borderRadius: 4,
                display: 'grid',
                placeItems: 'center',
              }}>
                <svg width="104" height="104" viewBox="0 0 29 29">
                  {/* Top-left finder pattern */}
                  <rect x="0" y="0" width="7" height="7" fill="#000"/>
                  <rect x="1" y="1" width="5" height="5" fill="white"/>
                  <rect x="2" y="2" width="3" height="3" fill="#000"/>
                  {/* Top-right finder pattern */}
                  <rect x="22" y="0" width="7" height="7" fill="#000"/>
                  <rect x="23" y="1" width="5" height="5" fill="white"/>
                  <rect x="24" y="2" width="3" height="3" fill="#000"/>
                  {/* Bottom-left finder pattern */}
                  <rect x="0" y="22" width="7" height="7" fill="#000"/>
                  <rect x="1" y="23" width="5" height="5" fill="white"/>
                  <rect x="2" y="24" width="3" height="3" fill="#000"/>
                  {/* Data modules — scattered pattern */}
                  <rect x="8" y="0" width="1" height="1" fill="#000"/>
                  <rect x="10" y="0" width="1" height="1" fill="#000"/>
                  <rect x="12" y="0" width="1" height="1" fill="#000"/>
                  <rect x="14" y="0" width="1" height="1" fill="#000"/>
                  <rect x="8" y="2" width="1" height="1" fill="#000"/>
                  <rect x="9" y="3" width="1" height="1" fill="#000"/>
                  <rect x="11" y="2" width="1" height="1" fill="#000"/>
                  <rect x="13" y="3" width="1" height="1" fill="#000"/>
                  <rect x="14" y="2" width="1" height="1" fill="#000"/>
                  <rect x="8" y="4" width="1" height="1" fill="#000"/>
                  <rect x="10" y="5" width="1" height="1" fill="#000"/>
                  <rect x="12" y="4" width="1" height="1" fill="#000"/>
                  <rect x="0" y="8" width="1" height="1" fill="#000"/>
                  <rect x="2" y="8" width="1" height="1" fill="#000"/>
                  <rect x="4" y="9" width="1" height="1" fill="#000"/>
                  <rect x="6" y="8" width="1" height="1" fill="#000"/>
                  <rect x="1" y="10" width="1" height="1" fill="#000"/>
                  <rect x="3" y="11" width="1" height="1" fill="#000"/>
                  <rect x="5" y="10" width="1" height="1" fill="#000"/>
                  <rect x="8" y="8" width="5" height="1" fill="#000"/>
                  <rect x="9" y="9" width="1" height="1" fill="#000"/>
                  <rect x="11" y="10" width="3" height="1" fill="#000"/>
                  <rect x="14" y="8" width="1" height="5" fill="#000"/>
                  <rect x="16" y="8" width="1" height="1" fill="#000"/>
                  <rect x="18" y="9" width="1" height="1" fill="#000"/>
                  <rect x="20" y="8" width="1" height="1" fill="#000"/>
                  <rect x="22" y="8" width="1" height="1" fill="#000"/>
                  <rect x="24" y="9" width="1" height="1" fill="#000"/>
                  <rect x="26" y="8" width="1" height="1" fill="#000"/>
                  <rect x="28" y="8" width="1" height="1" fill="#000"/>
                  <rect x="16" y="10" width="3" height="1" fill="#000"/>
                  <rect x="20" y="10" width="1" height="1" fill="#000"/>
                  <rect x="23" y="10" width="1" height="1" fill="#000"/>
                  <rect x="25" y="11" width="1" height="1" fill="#000"/>
                  <rect x="28" y="10" width="1" height="1" fill="#000"/>
                  <rect x="8" y="14" width="1" height="1" fill="#000"/>
                  <rect x="10" y="14" width="1" height="1" fill="#000"/>
                  <rect x="12" y="15" width="1" height="1" fill="#000"/>
                  <rect x="0" y="14" width="1" height="1" fill="#000"/>
                  <rect x="2" y="15" width="1" height="1" fill="#000"/>
                  <rect x="4" y="14" width="1" height="1" fill="#000"/>
                  <rect x="6" y="15" width="1" height="1" fill="#000"/>
                  <rect x="14" y="14" width="1" height="5" fill="#000"/>
                  <rect x="16" y="14" width="3" height="1" fill="#000"/>
                  <rect x="20" y="14" width="1" height="1" fill="#000"/>
                  <rect x="22" y="14" width="1" height="1" fill="#000"/>
                  <rect x="24" y="15" width="1" height="1" fill="#000"/>
                  <rect x="26" y="14" width="1" height="1" fill="#000"/>
                  <rect x="28" y="15" width="1" height="1" fill="#000"/>
                  <rect x="8" y="22" width="5" height="1" fill="#000"/>
                  <rect x="9" y="23" width="1" height="1" fill="#000"/>
                  <rect x="11" y="24" width="3" height="1" fill="#000"/>
                  <rect x="14" y="22" width="1" height="5" fill="#000"/>
                  <rect x="16" y="22" width="3" height="1" fill="#000"/>
                  <rect x="20" y="22" width="1" height="1" fill="#000"/>
                  <rect x="22" y="23" width="1" height="1" fill="#000"/>
                  <rect x="24" y="22" width="1" height="1" fill="#000"/>
                  <rect x="26" y="23" width="1" height="1" fill="#000"/>
                  <rect x="28" y="22" width="1" height="1" fill="#000"/>
                  <rect x="16" y="24" width="1" height="1" fill="#000"/>
                  <rect x="18" y="25" width="1" height="1" fill="#000"/>
                  <rect x="20" y="24" width="1" height="1" fill="#000"/>
                  <rect x="23" y="24" width="1" height="1" fill="#000"/>
                  <rect x="25" y="25" width="1" height="1" fill="#000"/>
                  <rect x="27" y="24" width="1" height="1" fill="#000"/>
                  <rect x="8" y="28" width="1" height="1" fill="#000"/>
                  <rect x="10" y="28" width="1" height="1" fill="#000"/>
                  <rect x="12" y="28" width="1" height="1" fill="#000"/>
                </svg>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" fullWidth>
                  Copy Link
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  style={{ borderColor: 'var(--green)', color: 'var(--green)' }}
                >
                  Share via WhatsApp
                </Button>
              </div>
              <p className="body-md muted">
                Recipient logs in with their phone. No crypto wallet needed.
              </p>
            </div>
          </Card>
          <div style={{ marginTop: 16 }}>
            <Button fullWidth onClick={() => onNext()}>
              Lock Funds →
            </Button>
          </div>
        </>
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
        className="mono-label"
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--outline)',
          padding: 0,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        ← Back
      </button>
      <ProgressStepper steps={['Amount', 'Recipient', 'Confirm']} currentStep={3} />
      <Card style={{ width: '100%', background: 'var(--surface-low)' }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
          <div style={{ animation: 'pulse 1.4s ease infinite' }}>
            <SolanaLogo size={40} color="var(--primary)" />
          </div>
          <p className="mono-data">
            <span key={statusIndex} style={{ animation: 'fadeIn 0.3s ease both', display: 'inline-block' }}>
              {statusStages[statusIndex]}
            </span>
          </p>
        </div>
      </Card>

      {isConfirmed ? (
        <Card style={{ marginTop: 16, background: 'var(--surface-low)', animation: 'fadeUp 0.4s ease both' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <DetailRow label="Escrow PDA" value="7xKp...mN3q" />
            <DetailRow label="Amount locked" value="200 USDC" />
            <DetailRow label="FX rate (Pyth)" value="1 USD = 134.2 NPR" />
            <DetailRow label="Recipient gets" value="≈ NPR 26,840" />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="mono-label muted">Solana TX</span>
              <a href="#" className="mono-data" style={{ color: 'var(--primary-light)' }}>
                Explorer <span className="link-icon">↗</span>
              </a>
            </div>
          </div>
        </Card>
      ) : null}
      <p className="body-md muted" style={{ marginTop: 16 }}>
        Funds are locked on-chain. Only your recipient can release them.
      </p>
      {isConfirmed ? (
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <Button fullWidth onClick={() => navigate('/send/done')}>
            View Transaction →
          </Button>
          <Link to="/send">
            <Button variant="ghost" fullWidth>
              Send Another Transfer
            </Button>
          </Link>
        </div>
      ) : null}
    </Card>
  )
}

function FeeRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span className="mono-data">{label}</span>
      <span className="mono-data">{value}</span>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span className="mono-label muted">{label}</span>
      <span className="mono-data">{value}</span>
    </div>
  )
}

function SendFlow({ step: propStep = 1 }) {
  const [step, setStep] = useState(propStep)

  return (
    <>
      {step === 1 ? (
        <AmountStep onNext={() => setStep(2)} />
      ) : step === 2 ? (
        <RecipientStep onNext={() => setStep(3)} onBack={() => setStep(1)} />
      ) : (
        <ConfirmStep onBack={() => setStep(2)} />
      )}
    </>
  )
}

export default SendFlow
