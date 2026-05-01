const styles = {
  confirmed: {
    background: 'var(--green-soft)',
    color: 'var(--green)',
    border: '1px solid rgba(5, 150, 105, 0.25)',
  },
  pending: {
    background: 'var(--amber-soft)',
    color: 'var(--amber)',
    border: '1px solid rgba(217, 119, 6, 0.25)',
  },
  cancelled: {
    background: 'var(--error-soft)',
    color: 'var(--error)',
    border: '1px solid rgba(220, 38, 38, 0.2)',
  },
}

const dots = {
  confirmed: '#059669',
  pending: '#d97706',
  cancelled: '#dc2626',
}

function StatusPill({ status }) {
  const key = status?.toLowerCase() ?? 'pending'
  const current = styles[key] ?? styles.pending
  const dotColor = dots[key] ?? dots.pending

  return (
    <span
      style={{
        ...current,
        borderRadius: 9999,
        padding: '4px 10px',
        fontFamily: 'Inter, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'capitalize',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      {status}
    </span>
  )
}

export default StatusPill
