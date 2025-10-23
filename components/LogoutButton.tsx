// app/components/LogoutButton.tsx
'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  
  const handleLogout = () => {
    signOut({
      // Opcional: Redirige al usuario a la página de login
      // después de cerrar sesión.
      callbackUrl: '/login',
    })
  }

  return (
    <button onClick={handleLogout}>
      Cerrar Sesión
    </button>
  )
}