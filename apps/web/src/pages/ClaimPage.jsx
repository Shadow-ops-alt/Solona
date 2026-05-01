import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
      window.setTimeout(() => navigate('/dashboard?view=received'), 1200)
    }, 1200)
  }

  return (
    <section style={{ maxWidth: 440, margin: '0 auto', padding: '20px 0 48px', display: 'grid', gap: 32 }}>
      <div style={{ textAlign: 'center', display: 'grid', gap: 12 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 auto', background: 'var(--green-soft)', color: 'var(--green)', padding: '6px 16px', borderRadius: 9999, fontWeight: 600, fontSize: 14 }}>
           <span>💸</span> Someone sent you money
        </div>
        <h2 style={{ fontSize: 56, color: 'var(--green)', fontWeight: 700, letterSpacing: '-0.02em', margin: '8px 0' }}>NPR 26,840</h2>
        <p style={{ fontSize: 15, color: 'var(--on-surface-muted)', fontWeight: 500 }}>≈ $200.00 USDC · Expires in 6 days</p>
      </div>

      <Card>
        <div style={{ display: 'grid', gap: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--on-surface)', textAlign: 'center' }}>
             Claim with your phone number
          </p>

          <Input
            label="Phone Number"
            leftSlot="🇳🇵 +977"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="98XXXXXXXX"
          />

          <AnimatePresence mode="wait">
            {!otpSent ? (
               <motion.div
                 key="send-otp"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0, height: 0 }}
               >
                  <Button fullWidth onClick={() => setOtpSent(true)}>
                    Send OTP
                  </Button>
               </motion.div>
            ) : !verified ? (
              <motion.div
                 key="verify-otp"
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'grid', gap: 20, paddingTop: 4 }}>
                  <Input
                    label="One-Time Password"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="6 digit code"
                  />
                  <Button fullWidth onClick={() => setVerified(true)}>
                    Verify Code
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {verified ? (
              <motion.div
                 initial={{ opacity: 0, y: 10, height: 0 }}
                 animate={{ opacity: 1, y: 0, height: 'auto' }}
                 style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'grid', gap: 16, paddingTop: 8 }}>
                  <Button
                    fullWidth
                    variant={claimDone ? 'success' : 'primary'}
                    onClick={handleClaim}
                    disabled={isClaiming || claimDone}
                    loading={isClaiming}
                    style={{
                      background: claimDone ? 'var(--green)' : '#000',
                      color: '#fff',
                      boxShadow: claimDone ? '0 4px 14px rgba(5, 150, 105, 0.4)' : '0 4px 14px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    {isClaiming ? 'Processing Claim...' : claimDone ? 'Claim Confirmed ✓' : 'Claim NPR 26,840 →'}
                  </Button>

                  {claimDone ? (
                    <motion.p
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       style={{ fontWeight: 600, color: 'var(--green)', textAlign: 'center', fontSize: 14 }}
                    >
                      Funds secured. Redirecting to dashboard...
                    </motion.p>
                  ) : null}

                  <div style={{ background: 'var(--surface-high)', padding: 16, borderRadius: 12, marginTop: 8 }}>
                     <p style={{ fontSize: 14, color: 'var(--on-surface-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                       Cash out via <span style={{ color: 'var(--amber)', fontWeight: 600 }}>MoonPay</span>{' '}
                       <span
                         style={{ background: 'var(--amber-soft)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, marginLeft: 4 }}
                       >
                         Off-ramp
                       </span>
                       <br />
                       Direct to your local bank or eSewa wallet.
                     </p>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Card>
    </section>
  )
}

export default ClaimPage
