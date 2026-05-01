import { Link, Outlet, useLocation } from 'react-router-dom'

function Layout() {
  const { pathname } = useLocation()
  const isClaim = pathname.startsWith('/claim')
  const isSend = pathname.startsWith('/send')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav
        style={{
          height: 56,
          background: 'var(--surface-low)',
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
        <Link to="/" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 600,
              fontSize: 18,
              color: 'var(--on-surface)',
            }}
          >
            ChainRemit
          </span>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: 'var(--outline)',
            }}
          >
            ∅ → ∞
          </span>
        </Link>

        {!isClaim ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {!isSend ? (
              <Link to="/send">
                <button
                  type="button"
                  className="mono-label"
                  style={{
                    border: '1px solid var(--outline-dim)',
                    borderRadius: 9999,
                    padding: '6px 14px',
                    background: 'transparent',
                    color: 'var(--on-surface-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Send Money
                </button>
              </Link>
            ) : null}
            <Link to="/dashboard">
              <button
                type="button"
                className="mono-label"
                style={{
                  border: '1px solid var(--outline-dim)',
                  borderRadius: 9999,
                  padding: '6px 14px',
                  background: 'transparent',
                  color: 'var(--on-surface-muted)',
                  cursor: 'pointer',
                }}
              >
                Dashboard
              </button>
            </Link>
          </div>
        ) : null}
      </nav>

      <div className="screen" style={{ paddingTop: 32 }}>
        <Outlet />
      </div>
    </div>
  )
}

export default Layout
