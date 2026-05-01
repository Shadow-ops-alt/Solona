import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import TransferRow from '../components/TransferRow'
import { useRole } from '../context/RoleContext'
import { mockTransfers } from '../data/mockTransfers'

function Dashboard() {
  const { activeRole } = useRole()
  const [searchParams] = useSearchParams()
  const [historyTab, setHistoryTab] = useState(activeRole === 'sender' ? 'sent' : 'received')
  const defaultTabFromRole = activeRole === 'sender' ? 'sent' : 'received'

  useEffect(() => {
    const view = searchParams.get('view')
    if (view === 'sent' || view === 'received') {
      setHistoryTab(view)
      return
    }
    setHistoryTab(defaultTabFromRole)
  }, [defaultTabFromRole, searchParams])

  const transfers = useMemo(
    () => mockTransfers.filter((transfer) => transfer.direction === historyTab),
    [historyTab],
  )
  const totalSent = useMemo(
    () => mockTransfers.filter((transfer) => transfer.direction === 'sent').length,
    [],
  )

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <h2 style={{ animation: 'fadeUp 0.3s ease both' }}>Transfer History</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card style={{ animation: 'fadeUp 0.3s ease both' }}>
          <p className="mono-label muted">Total sent</p>
          <h2 style={{ marginTop: 8 }}>1,240 USDC</h2>
          <p className="mono-label muted" style={{ marginTop: 8 }}>
            across {totalSent} transfers
          </p>
        </Card>
        <Card style={{ border: '1px solid var(--green)', animation: 'fadeUp 0.3s ease 0.05s both' }}>
          <p className="mono-label muted">Saved vs. Western Union</p>
          <h2 style={{ marginTop: 8, color: 'var(--green)' }}>$87.40</h2>
          <p className="mono-label muted" style={{ marginTop: 8 }}>
            at avg 7% fee — money that stays with your family
          </p>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {['sent', 'received'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setHistoryTab(item)}
            className="mono-label"
            style={{
              borderRadius: 9999,
              border: 'none',
              padding: '8px 18px',
              background: historyTab === item ? 'var(--primary)' : 'var(--surface-low)',
              color: historyTab === item ? 'var(--on-surface)' : 'var(--on-surface-muted)',
              textTransform: 'capitalize',
              cursor: 'pointer',
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {transfers.length > 0 ? (
        <div>
          {transfers.map((transfer, index) => (
            <div key={transfer.id} style={{ animation: `fadeUp 0.25s ease ${index * 0.05}s both` }}>
              <TransferRow transfer={transfer} view={historyTab} />
            </div>
          ))}
        </div>
      ) : (
        <Card style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
          <span className="muted" style={{ fontSize: 28 }}>
            ⟲
          </span>
          <h3>No {historyTab} transfers yet</h3>
          <Link to="/send">
            <Button>Send Your First Transfer</Button>
          </Link>
        </Card>
      )}
    </section>
  )
}

export default Dashboard
