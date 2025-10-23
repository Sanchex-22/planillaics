// app/login/page.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('') // Limpia errores previos

    try {
      // 1. Llama a signIn con 'credentials'
      const result = await signIn('credentials', {
        redirect: false, // <-- Importante: no redirige automáticamente
        email: email,
        password: password,
      })

      // 2. Comprueba el resultado
      if (result?.ok) {
        // Éxito: redirige al dashboard o página principal
        router.push('/dashboard') 
        // (Asegúrate de tener una página /dashboard)
      } else {
        // Error: muestra un mensaje
        setError('Credenciales inválidas. Por favor, intenta de nuevo.')
        console.error('Login failed:', result?.error)
      }
    } catch (err) {
      setError('Ocurrió un error inesperado.')
      console.error(err)
    }
  }

  return (
    <div>
      <h1>Iniciar Sesión</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}