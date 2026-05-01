import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
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
    <section style={{ display: 'grid', gap: 32, paddingBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', animation: 'fadeUp 0.3s ease both' }}>
         <h2 style={{ fontSize: 32 }}>Transfer History</h2>
         <Link to="/send" className="hide-on-mobile">
            <Button variant="ghost" style={{ padding: '10px 16px', fontSize: 14 }}>+ New Transfer</Button>
         </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <Card style={{ animation: 'fadeUp 0.3s ease both', background: 'var(--surface)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface-muted)' }}>Total sent</p>
          <h2 style={{ marginTop: 12, fontSize: 36 }}>1,240 USDC</h2>
          <p style={{ fontSize: 13, color: 'var(--on-surface-muted)', marginTop: 8 }}>
            across {totalSent} transfers
          </p>
        </Card>
        <Card style={{ animation: 'fadeUp 0.3s ease 0.1s both', background: 'var(--primary)', color: '#fff', border: 'none' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Saved vs. Western Union</p>
          <h2 style={{ marginTop: 12, fontSize: 36, color: '#fff' }}>$87.40</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>
            at avg 7% fee — money that stays with family
          </p>
        </Card>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
         {/* Tabs */}
         <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--outline-dim)', paddingBottom: 12 }}>
           {['sent', 'received'].map((item) => {
              const isActive = historyTab === item;
              return (
                 <button
                   key={item}
                   type="button"
                   onClick={() => setHistoryTab(item)}
                   style={{
                     border: 'none',
                     background: isActive ? 'var(--primary-soft)' : 'transparent',
                     color: isActive ? 'var(--primary)' : 'var(--on-surface-muted)',
                     padding: '8px 20px',
                     borderRadius: 9999,
                     fontWeight: 600,
                     fontSize: 14,
                     textTransform: 'capitalize',
                     cursor: 'pointer',
                     transition: 'all 0.2s ease',
                   }}
                 >
                   {item}
                 </button>
              )
           })}
         </div>

         {/* List */}
         {transfers.length > 0 ? (
           <div style={{ display: 'grid', gap: 12 }}>
             {transfers.map((transfer, index) => (
               <motion.div
                 key={transfer.id}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.05, duration: 0.3 }}
               >
                 <TransferRow transfer={transfer} view={historyTab} />
               </motion.div>
             ))}
           </div>
         ) : (
           <Card style={{ display: 'grid', justifyItems: 'center', gap: 16, textAlign: 'center', padding: '48px 24px', background: 'var(--surface-high)' }}>
             <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: 24, boxShadow: 'var(--shadow-sm)' }}>
               💸
             </div>
             <div>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>No {historyTab} transfers yet</h3>
                <p style={{ color: 'var(--on-surface-muted)', fontSize: 14, maxWidth: 300, margin: '0 auto' }}>
                  Your complete history of escrowed funds and claims will appear here.
                </p>
             </div>
             <Link to="/send" style={{ marginTop: 8 }}>
               <Button>Send Your First Transfer</Button>
             </Link>
           </Card>
         )}
      </div>
    </section>
  )
}

export default Dashboard
