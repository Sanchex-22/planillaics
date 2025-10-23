import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // tus providers (por ejemplo, Google, Credentials, etc.)
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token, user }) {
      session.user.id = user?.id ?? token.sub
      return session
    },
  },
}

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions)
