// app/providers.tsx
'use client'

import { SessionProvider } from 'next-auth/react'
import React from 'react'

type Props = {
  children: React.ReactNode
}

// Envolvemos el SessionProvider en un componente de cliente
export default function NextAuthProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>
}