function ProgressStepper({ steps, currentStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 28 }}>
      {steps.map((step, index) => {
        const position = index + 1
        const isCompleted = position < currentStep
        const isActive = position === currentStep

        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s ease',
                  background: isCompleted
                    ? 'var(--green)'
                    : isActive
                    ? 'var(--primary)'
                    : 'var(--surface-high)',
                  color: isCompleted || isActive ? '#fff' : 'var(--outline)',
                  boxShadow: isActive
                    ? '0 4px 12px rgba(109, 40, 217, 0.3)'
                    : isCompleted
                    ? '0 4px 12px rgba(5, 150, 105, 0.25)'
                    : 'none',
                }}
              >
                {isCompleted ? '✓' : position}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--primary)' : isCompleted ? 'var(--green)' : 'var(--outline)',
                  whiteSpace: 'nowrap',
                }}
              >
                {step}
              </span>
            </div>
            {position < steps.length ? (
              <div
                style={{
                  height: 2,
                  flex: 1,
                  margin: '0 8px 22px',
                  borderRadius: 2,
                  background: isCompleted
                    ? 'var(--green)'
                    : 'var(--outline-dim)',
                  transition: 'background 0.3s ease',
                }}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default ProgressStepper
