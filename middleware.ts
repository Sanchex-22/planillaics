// middleware.ts

export { default } from 'next-auth/middleware'

export const config = {
  // Protege solo las rutas que comiencen con '/dashboard' o '/admin'
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}