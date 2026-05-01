import { Link, Outlet, useLocation } from 'react-router-dom'
import SolanaLogo from '../components/SolanaLogo'
import ThemeToggle from '../components/ThemeToggle'

const navItems = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/send', label: 'Send', icon: '↑' },
  { to: '/dashboard', label: 'History', icon: '≡' },
  { to: '/claim/demo', label: 'Receive', icon: '↓' },
]

function Layout() {
  const { pathname } = useLocation()
  const isClaim = pathname.startsWith('/claim')
  const isSend = pathname.startsWith('/send')
  const isDone = pathname === '/send/done'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Top nav ── */}
      <nav
        style={{
          height: 60,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--outline-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'var(--primary)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 8px rgba(109,40,217,0.35)',
            }}
          >
            <SolanaLogo size={18} color="#fff" />
          </div>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 17,
              color: 'var(--on-surface)',
              letterSpacing: '-0.02em',
            }}
          >
            ChainRemit
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ThemeToggle />

          {/* Desktop right nav — hidden on claim pages */}
          {!isClaim ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Wallet badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'var(--primary-soft)',
                  border: '1px solid rgba(109,40,217,0.2)',
                  borderRadius: 9999,
                  padding: '5px 12px 5px 8px',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--green)',
                    boxShadow: '0 0 0 2px rgba(5,150,105,0.25)',
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--primary)',
                  }}
                >
                  7xKp…mN3q
                </span>
              </div>

              {/* Desktop nav links */}
              {!isSend ? (
                <NavPill to="/send" label="Send Money" active={false} />
              ) : null}
              <NavPill to="/dashboard" label="History" active={pathname === '/dashboard'} />
            </div>
          ) : null}
        </div>
      </nav>

      {/* ── Page content ── */}
      <div className="screen" style={{ paddingTop: 32 }}>
        <Outlet />
      </div>

      {/* ── Mobile bottom nav ── */}
      {!isClaim && !isDone ? (
        <nav
          style={{
            display: 'flex',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 72,
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--outline-dim)',
            zIndex: 100,
            padding: '0 8px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
          }}
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => {
            const isActive = item.to === '/'
              ? pathname === '/'
              : pathname.startsWith(item.to) && item.to !== '/'

            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  flex: 1,
                  display: 'grid',
                  placeItems: 'center',
                  gap: 3,
                  padding: '10px 4px 6px',
                  textDecoration: 'none',
                  borderRadius: 12,
                  transition: 'background 0.15s ease',
                  color: isActive ? 'var(--primary)' : 'var(--outline)',
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    lineHeight: 1,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {item.icon}
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 10,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </span>
                {isActive ? (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                    }}
                  />
                ) : null}
              </Link>
            )
          })}
        </nav>
      ) : null}
    </div>
  )
}

function NavPill({ to, label, active }) {
  return (
    <Link to={to}>
      <button
        type="button"
        style={{
          border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--outline-dim)',
          borderRadius: 9999,
          padding: '7px 16px',
          background: active ? 'var(--primary-soft)' : 'transparent',
          color: active ? 'var(--primary)' : 'var(--on-surface-muted)',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)'
          e.currentTarget.style.color = 'var(--primary)'
          e.currentTarget.style.background = 'var(--primary-soft)'
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.borderColor = 'var(--outline-dim)'
            e.currentTarget.style.color = 'var(--on-surface-muted)'
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        {label}
      </button>
    </Link>
  )
}

export default Layout
