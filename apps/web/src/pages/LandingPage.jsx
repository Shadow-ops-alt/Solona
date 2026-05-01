import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import SolanaLogo from '../components/SolanaLogo'

function LandingPage() {
  return (
    <section style={{ display: 'grid', gap: 56 }}>
      {/* ── SECTION 1: Hero ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 32,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'grid', gap: 24 }}>
          <span
            className="mono-label"
            style={{
              display: 'inline-flex',
              width: 'fit-content',
              color: 'var(--green)',
              border: '1px solid var(--outline-dim)',
              borderRadius: 9999,
              padding: '6px 12px',
              animation: 'fadeUp 0.5s ease both',
            }}
          >
            Built on Solana · Devnet
          </span>
          <h1 style={{ animation: 'fadeUp 0.5s ease both' }}>
            Send money home.
            <br />
            Not fees.
          </h1>
          <p className="body-lg muted" style={{ maxWidth: 560, animation: 'fadeUp 0.5s ease 0.1s both' }}>
            Transfer SOL or USDC to Nepal in seconds. Recipients cash out in NPR. No banks. No 7%
            cut.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animation: 'fadeUp 0.5s ease 0.2s both' }}>
            <Link to="/send">
              <Button>Send Money</Button>
            </Link>
            <Link to="/claim/demo">
              <Button variant="ghost">Receive a Transfer</Button>
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', animation: 'fadeUp 0.5s ease 0.3s both' }}>
            {[
              { value: '< $0.01', label: 'per transfer' },
              { value: '~0.4s', label: 'finality' },
              { value: '$8B+', label: 'market size' },
            ].map((item) => (
              <div key={item.label}>
                <p className="mono-data">{item.value}</p>
                <p className="mono-label muted">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <Card style={{ animation: 'fadeUp 0.6s ease 0.15s both' }}>
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🇺🇸 You</span>
              <span className="mono-data">$200 USDC</span>
            </div>
            <div style={{ position: 'relative', textAlign: 'center' }}>
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
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <SolanaLogo size={18} />
                  <span
                    className="mono-label"
                    style={{
                      color: 'var(--green)',
                      borderRadius: 9999,
                      border: '1px solid var(--green)',
                      padding: '4px 10px',
                    }}
                  >
                    &lt; $0.01 fee
                  </span>
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🇳🇵 Ama</span>
              <span className="mono-data">NPR 26,800</span>
            </div>
            <span
              style={{
                background: '#052916',
                color: '#14f195',
                border: '1px solid #14f195',
                borderRadius: 9999,
                padding: '4px 12px',
                width: 'fit-content',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
              }}
            >
              Confirmed in 0.4s ✓
            </span>
          </div>
        </Card>
      </div>

      {/* ── SECTION 2: How it works ── */}
      <div style={{ display: 'grid', gap: 20 }}>
        <h2>How it works</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
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
              style={{ animation: `fadeUp 0.5s ease ${0.1 + i * 0.1}s both` }}
            >
              <div style={{ display: 'grid', gap: 10 }}>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--primary-light)',
                  }}
                >
                  {step.num} · {step.title}
                </span>
                <h3>{step.title}</h3>
                <p className="body-md muted">{step.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: Fee comparison ── */}
      <Card style={{ background: 'var(--surface-low)' }}>
        <div style={{ display: 'grid', gap: 20 }}>
          <p className="mono-label muted">Fee comparison</p>
          <div style={{ display: 'grid', gap: 16 }}>
            <FeeBar label="Western Union" percent="5–8%" fillWidth="70%" color="var(--error)" />
            <FeeBar label="ChainRemit" percent="< 0.1%" fillWidth="2%" color="var(--green)" />
          </div>
          <p className="mono-label muted">
            $8B+ in annual Nepal remittances. Families lose ~$480M/year in fees.
          </p>
        </div>
      </Card>
    </section>
  )
}

function FeeBar({ label, percent, fillWidth, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span className="mono-data" style={{ minWidth: 130 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
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
            borderRadius: 4,
            background: color,
            '--target-width': fillWidth,
            animation: 'growBar 0.8s ease 0.3s both',
          }}
        />
      </div>
      <span className="mono-label" style={{ minWidth: 50, textAlign: 'right' }}>{percent}</span>
    </div>
  )
}

export default LandingPage
