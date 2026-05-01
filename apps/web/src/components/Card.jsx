function Card({ children, style, glass = false, ...props }) {
  return (
    <div
      style={{
        background: glass ? 'var(--glass-bg)' : 'var(--surface)',
        border: glass ? '1px solid var(--glass-border)' : '1px solid var(--outline-dim)',
        borderRadius: 'var(--radius)',
        padding: 24,
        boxShadow: glass ? 'var(--shadow-glass)' : 'var(--shadow-md)',
        backdropFilter: glass ? 'blur(20px)' : undefined,
        WebkitBackdropFilter: glass ? 'blur(20px)' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
