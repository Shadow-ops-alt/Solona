const baseStyle = {
  borderRadius: 12,
  padding: '16px 28px',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 600,
  fontSize: 16,
  lineHeight: 1,
  border: '1.5px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.18s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  position: 'relative',
  userSelect: 'none',
  letterSpacing: '-0.01em',
}

const variants = {
  primary: {
    background: 'var(--primary)',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(109, 40, 217, 0.3)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--primary)',
    border: '1.5px solid var(--primary)',
  },
  success: {
    background: 'var(--green)',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
  },
}

function Spinner() {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled = false,
  onMouseEnter,
  onMouseLeave,
  style,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      className="focusable"
      disabled={isDisabled}
      style={{
        ...baseStyle,
        ...(variants[variant] ?? variants.primary),
        width: fullWidth ? '100%' : undefined,
        opacity: isDisabled && !loading ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={(event) => {
        if (!isDisabled) {
          if (variant === 'primary') {
            event.currentTarget.style.boxShadow = '0 6px 20px rgba(109, 40, 217, 0.45)'
            event.currentTarget.style.transform = 'translateY(-1px)'
          } else if (variant === 'success') {
            event.currentTarget.style.boxShadow = '0 6px 20px rgba(5, 150, 105, 0.45)'
            event.currentTarget.style.transform = 'translateY(-1px)'
          } else {
            event.currentTarget.style.background = 'var(--primary-soft)'
          }
        }
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = variants[variant]?.boxShadow ?? 'none'
        event.currentTarget.style.transform = 'none'
        if (variant === 'ghost') {
          event.currentTarget.style.background = 'transparent'
        }
        onMouseLeave?.(event)
      }}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

export default Button
