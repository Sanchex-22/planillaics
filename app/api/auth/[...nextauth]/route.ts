// app/api/auth/[...nextauth]/route.ts

import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'tu@email.com' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user || !user.hashedPassword) {
          return null
        }
        const isValidPassword = await compare(
          credentials.password,
          user.hashedPassword
        )
        if (!isValidPassword) {
          return null
        }
        // Devuelve el objeto con tus campos personalizados
        return {
          id: user.id,
          nombre: user.nombre,
          email: user.email, // email es usado por NextAuth
          rol: user.rol,
        }
      },
    }),
  ],
  session: {
    strategy: 'database',
  },
  callbacks: {
    // El callback 'jwt' ahora sabe que 'user' tiene 'id', 'rol', y 'nombre'
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = user.rol
        token.nombre = user.nombre
      }
      return token
    },
    // El callback 'session' ahora sabe que 'session.user' y 'token'
    // tienen tus campos personalizados.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.rol = token.rol
        session.user.nombre = token.nombre
        // (El email y name/image se manejan por defecto)
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }