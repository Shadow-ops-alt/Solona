import { createContext, useContext, useMemo, useState } from 'react'

const RoleContext = createContext(undefined)

export function RoleProvider({ children }) {
  const [activeRole, setActiveRole] = useState('sender')

  const value = useMemo(
    () => ({
      activeRole,
      setActiveRole,
      isSender: activeRole === 'sender',
    }),
    [activeRole],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within RoleProvider')
  }
  return context
}
