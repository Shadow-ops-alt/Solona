import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useRole } from '../context/RoleContext'

function ClaimPage() {
  const navigate = useNavigate()
  const { setActiveRole } = useRole()
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [verified, setVerified] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimDone, setClaimDone] = useState(false)

  const handleClaim = () => {
    setIsClaiming(true)
    setActiveRole('receiver')
    window.setTimeout(() => {
      setIsClaiming(false)
      setClaimDone(true)
      window.setTimeout(() => navigate('/dashboard?view=received'), 700)
    }, 900)
  }

  return (
    <section style={{ maxWidth: 420, margin: '0 auto', padding: '20px 0 48px', display: 'grid', gap: 24 }}>
      <div style={{ textAlign: 'center', display: 'grid', gap: 10 }}>
        <p className="mono-label muted">Someone sent you money</p>
        <h2 style={{ fontSize: 48, color: 'var(--green)' }}>NPR 26,840</h2>
        <p className="mono-label muted">≈ $200.00 USDC · Expires in 6 days</p>
      </div>
      <div className="hr" />
      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <p className="mono-label muted">Claim with your phone number</p>
          <Input
            label="Phone Number"
            leftSlot="🇳🇵 +977"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="98XXXXXXXX"
          />
          {!otpSent ? (
            <Button fullWidth onClick={() => setOtpSent(true)}>
              Send OTP
            </Button>
          ) : (
            <div style={{ animation: 'slideDown 0.2s ease both' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <Input
                  label="OTP"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="6 digit code"
                />
                <Button fullWidth onClick={() => setVerified(true)}>
                  Verify
                </Button>
              </div>
            </div>
          )}
          {verified ? (
            <div style={{ display: 'grid', gap: 16, animation: 'fadeUp 0.3s ease both' }}>
              <Button
                fullWidth
                onClick={handleClaim}
                disabled={isClaiming || claimDone}
                style={{
                  background: '#00ec91',
                  color: '#002110',
                  borderColor: '#00ec91',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.boxShadow = '0 0 0 3px rgba(20,241,149,0.25)'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.boxShadow = 'none'
                }}
              >
                {isClaiming ? 'Processing Claim...' : claimDone ? 'Claim Confirmed ✓' : 'Claim NPR 26,840 →'}
              </Button>
              {claimDone ? (
                <p className="mono-label" style={{ color: 'var(--green)', textAlign: 'center' }}>
                  Claim successful. Redirecting to dashboard...
                </p>
              ) : null}
              <p className="body-md muted" style={{ textAlign: 'center' }}>
                Cash out via <span style={{ color: 'var(--amber)' }}>MoonPay</span>{' '}
                <span
                  className="mono-label"
                  style={{ border: '1px solid var(--amber)', color: 'var(--amber)', padding: '2px 8px' }}
                >
                  Off-ramp
                </span>{' '}
                · Direct to your bank or eSewa
              </p>
              <Button variant="ghost" fullWidth onClick={() => navigate('/dashboard?view=received')}>
                Go to Dashboard
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  )
}

export default ClaimPage
