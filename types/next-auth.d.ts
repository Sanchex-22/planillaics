// types/next-auth.d.ts

import 'next-auth'
import 'next-auth/jwt'
import 'next-auth/adapters' // <-- Importante añadir este
import { DefaultSession } from 'next-auth'

/**
 * Extiende el tipo 'User' de NextAuth
 */
declare module 'next-auth' {
  interface User {
    id: string
    nombre: string
    rol: string
  }

  /**
   * Extiende el tipo 'Session' del cliente
   */
  interface Session {
    user: {
      id: string
      nombre: string
      rol: string
    } & DefaultSession['user'] // Mantiene los campos por defecto (name, email, image)
  }
}

/**
 * Extiende el tipo 'JWT' (el token)
 */
declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    nombre: string
    rol: string
  }
}

// --- 👇 ESTA ES LA PARTE NUEVA Y CRUCIAL 👇 ---

/**
 * Extiende el tipo 'AdapterUser' que usa el PrismaAdapter
 */
declare module 'next-auth/adapters' {
  interface AdapterUser {
    // Añade aquí los campos que están en tu modelo User de Prisma
    // y que no están en el AdapterUser por defecto
    id: string
    nombre: string
    rol: string
    emailVerified?: Date | null // Asegúrate que los tipos coincidan con tu schema
  }
}