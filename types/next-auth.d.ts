import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      rol: string
      nombre: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    rol: string
    nombre: string
  }
}
