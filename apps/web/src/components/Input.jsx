import { useState } from 'react'

function Input({ label, leftSlot, helperText, style, inputStyle, ...props }) {
  const [focused, setFocused] = useState(false)

  return (
    <label style={{ display: 'grid', gap: 6, ...style }}>
      {label ? (
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--on-surface-muted)',
          }}
        >
          {label}
        </span>
      ) : null}
      <div
        style={{
          background: focused ? '#fff' : 'var(--bg-low)',
          border: focused ? '1.5px solid var(--primary)' : '1.5px solid var(--outline-dim)',
          borderRadius: 10,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          boxShadow: focused ? '0 0 0 3px rgba(109, 40, 217, 0.12)' : 'var(--shadow-sm)',
        }}
      >
        {leftSlot ? (
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--on-surface-muted)',
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            {leftSlot}
          </span>
        ) : null}
        <input
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--on-surface)',
            fontFamily: props['data-mono'] ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
            fontSize: 16,
            fontWeight: 500,
            outline: 'none',
            ...inputStyle,
          }}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
          {...props}
        />
      </div>
      {helperText ? (
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            color: 'var(--on-surface-muted)',
          }}
        >
          {helperText}
        </span>
      ) : null}
    </label>
  )
}

export default Input
