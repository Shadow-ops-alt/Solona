import { useTheme } from '../context/ThemeContext'

const toggleStyles = `
  .theme-toggle {
    position: relative;
    width: 52px;
    height: 28px;
    border-radius: 9999px;
    border: 1.5px solid var(--outline-dim);
    background: var(--surface-high);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    transition: background 0.3s ease, border-color 0.3s ease;
    flex-shrink: 0;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .theme-toggle:hover {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(109, 40, 217, 0.1);
  }

  .theme-toggle:focus-visible {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(109, 40, 217, 0.2);
  }

  .theme-toggle__track {
    position: absolute;
    inset: 2px;
    border-radius: 9999px;
    overflow: hidden;
  }

  .theme-toggle__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary);
    display: grid;
    place-items: center;
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                background 0.3s ease;
    will-change: transform;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .theme-toggle--dark .theme-toggle__thumb {
    transform: translateX(24px);
    background: var(--primary-light);
  }

  .theme-toggle__icon {
    width: 12px;
    height: 12px;
    transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform, opacity;
  }

  .theme-toggle__sun {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }

  .theme-toggle--dark .theme-toggle__sun {
    opacity: 0;
    transform: rotate(90deg) scale(0);
  }

  .theme-toggle__moon {
    opacity: 0;
    transform: rotate(-90deg) scale(0);
    position: absolute;
  }

  .theme-toggle--dark .theme-toggle__moon {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
`

function SunIcon() {
  return (
    <svg
      className="theme-toggle__icon theme-toggle__sun"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      className="theme-toggle__icon theme-toggle__moon"
      viewBox="0 0 24 24"
      fill="#fff"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <>
      <style>{toggleStyles}</style>
      <button
        type="button"
        className={`theme-toggle${isDark ? ' theme-toggle--dark' : ''}`}
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <div className="theme-toggle__track">
          <div className="theme-toggle__thumb">
            <SunIcon />
            <MoonIcon />
          </div>
        </div>
      </button>
    </>
  )
}
