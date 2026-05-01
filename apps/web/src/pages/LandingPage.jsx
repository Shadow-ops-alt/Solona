import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import SolanaLogo from '../components/SolanaLogo'

function LandingPage() {
  return (
    <section style={{ display: 'grid', gap: 64 }}>
      {/* ── SECTION 1: Hero ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 40,
          alignItems: 'center',
          marginTop: 24,
        }}
      >
        <div style={{ display: 'grid', gap: 28 }}>
          <span
            style={{
              display: 'inline-flex',
              width: 'fit-content',
              color: 'var(--green)',
              background: 'var(--green-soft)',
              border: '1px solid rgba(5, 150, 105, 0.2)',
              borderRadius: 9999,
              padding: '6px 14px',
              animation: 'fadeUp 0.5s ease both',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Built on Solana · Devnet
          </span>
          <h1 style={{ animation: 'fadeUp 0.5s ease 0.1s both' }}>
            Send money home.
            <br />
            Not fees.
          </h1>
          <p className="body-lg muted" style={{ maxWidth: 560, animation: 'fadeUp 0.5s ease 0.2s both' }}>
            Transfer SOL or USDC to Nepal in seconds. Recipients cash out in NPR. No banks. No 7%
            cut. Trust-first fintech powered by Solana.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', animation: 'fadeUp 0.5s ease 0.3s both' }}>
            <Link to="/send">
              <Button>Send Money</Button>
            </Link>
            <Link to="/claim/demo">
              <Button variant="ghost">Receive a Transfer</Button>
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', animation: 'fadeUp 0.5s ease 0.4s both', marginTop: 12 }}>
            {[
              { value: '< $0.01', label: 'per transfer' },
              { value: '~0.4s', label: 'finality' },
              { value: '$8B+', label: 'market size' },
            ].map((item) => (
              <div key={item.label}>
                <p className="mono-data" style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{item.value}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--on-surface-muted)' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <Card glass style={{ animation: 'fadeUp 0.6s ease 0.2s both' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>🇺🇸</span>
                <span style={{ fontWeight: 600 }}>You</span>
              </div>
              <span className="mono-data" style={{ fontWeight: 600 }}>$200 USDC</span>
            </div>
            <div style={{ position: 'relative', textAlign: 'center', margin: '8px 0' }}>
              <div className="hr" />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <span
                  style={{
                    background: 'var(--surface)',
                    padding: '4px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 9999,
                    border: '1px solid var(--outline-dim)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <SolanaLogo size={16} />
                  <span
                    style={{
                      color: 'var(--green)',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    &lt; $0.01 fee
                  </span>
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>🇳🇵</span>
                <span style={{ fontWeight: 600 }}>Ama</span>
              </div>
              <span className="mono-data" style={{ fontWeight: 600 }}>NPR 26,800</span>
            </div>
            <div style={{ marginTop: 8 }}>
               <span
                  style={{
                    background: 'var(--green-soft)',
                    color: 'var(--green)',
                    border: '1px solid rgba(5, 150, 105, 0.2)',
                    borderRadius: 9999,
                    padding: '6px 14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                  Confirmed in 0.4s
                </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── SECTION 2: How it works ── */}
      <div style={{ display: 'grid', gap: 24 }}>
        <h2>How it works</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {[
            {
              num: '01',
              title: 'Sender deposits',
              desc: 'Send USDC or SOL. Funds lock in a trustless escrow on Solana. Your recipient gets a claim link.',
            },
            {
              num: '02',
              title: 'Recipient claims',
              desc: 'Open the link, verify with your phone number. No wallet or crypto knowledge needed.',
            },
            {
              num: '03',
              title: 'Cash out locally',
              desc: 'MoonPay converts USDC to NPR and sends to your bank, eSewa, or Khalti.',
            },
          ].map((step, i) => (
            <Card
              key={step.num}
              style={{ animation: `fadeUp 0.5s ease ${0.1 + i * 0.15}s both` }}
            >
              <div style={{ display: 'grid', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--primary-soft)',
                    color: 'var(--primary)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {step.num}
                </div>
                <h3>{step.title}</h3>
                <p className="body-md muted">{step.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: Fee comparison ── */}
      <Card style={{ background: 'var(--surface-high)', border: 'none' }}>
        <div style={{ display: 'grid', gap: 24 }}>
          <h3 style={{ fontSize: 18 }}>Fee comparison</h3>
          <div style={{ display: 'grid', gap: 20 }}>
            <FeeBar label="Western Union" percent="5–8%" fillWidth="70%" color="var(--error)" bg="var(--error-soft)" />
            <FeeBar label="ChainRemit" percent="< 0.1%" fillWidth="2%" color="var(--green)" bg="var(--green-soft)" />
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--on-surface-muted)', marginTop: 4 }}>
            $8B+ in annual Nepal remittances. Families lose ~$480M/year in fees.
          </p>
        </div>
      </Card>
    </section>
  )
}

function FeeBar({ label, percent, fillWidth, color, bg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <span style={{ minWidth: 140, fontWeight: 600, fontSize: 15 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 12,
          borderRadius: 6,
          background: 'var(--outline-dim)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            borderRadius: 6,
            background: color,
            '--target-width': fillWidth,
            animation: 'growBar 0.8s ease 0.4s both',
          }}
        />
      </div>
      <span style={{ minWidth: 60, textAlign: 'right', fontWeight: 600, color, fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
        {percent}
      </span>
    </div>
  )
}

export default LandingPage
