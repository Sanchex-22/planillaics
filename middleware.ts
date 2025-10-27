import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// ---
// (NUEVO) CORRECCIÓN DE TIPOS DE CLERK
// ---
// Esto "enseña" a TypeScript la forma de tus sessionClaims personalizadas,
// corrigiendo el error "Property 'rol' does not exist on type '{}'".

// Define el tipo para tu rol
type AppRole = 'super_admin' | 'admin' | 'moderator' | 'user' | 'member' | string | null | undefined;

// Define la estructura de tu claim personalizado 'o'
interface CustomOrganizationClaims {
  rol: AppRole;
  // ... puedes añadir otras propiedades que tengas dentro de 'o'
}

// Usa "declaration merging" para extender los tipos de Clerk
declare global {
  interface ServerSideAuth {
    /**
     * Sobrescribe el tipo 'claims' en el middleware (lo que retorna `auth()`)
     * para incluir tus claims personalizados.
     */
    claims: ServerSideAuth['claims'] & {
      o?: CustomOrganizationClaims;
    };
  }
}
// ---
// (FIN DE LA CORRECCIÓN)
// ---


// ---
// 1. Definir Rutas Públicas
// ---
// Rutas que CUALQUIERA puede visitar (incluso sin loguearse)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',             // La página de inicio de sesión
  '/not-access(.*)',         // Página de "Acceso no válido" debe ser pública o semi-pública
  '/api/webhooks/clerk(.*)', // ¡IMPORTANTE! El webhook debe ser público
])

// ---
// 2. Definir Configuración de Roles (¡La "Fuente de Verdad"!)
// ---

// (NUEVO) Lista de TODOS los roles que tu aplicación reconoce como válidos.
const VALID_APP_ROLES: string[] = [
    'super_admin',
    'admin',
    'moderator',
    // 'user',
    // 'member'
    ];

// Definición de permisos POR RUTA
const roleConfig = {
  '/dashboard': ['super_admin', 'admin', 'moderator'],
  '/empleados': ['super_admin', 'admin', 'moderator'],
  '/calcular-planilla': ['super_admin', 'admin', 'moderator'],
  '/decimo-tercer-mes': ['super_admin', 'admin', 'moderator'],
  '/impuesto-sobre-renta': ['super_admin', 'admin', 'moderator'],
  '/pagos-sipe': ['super_admin', 'admin', 'moderator'],
  '/reportes': ['super_admin', 'admin', 'moderator'],
  '/parametros': ['super_admin', 'admin', 'moderator'],
  '/empresas': ['super_admin', 'admin'],
  '/configuracion': ['super_admin', 'admin'],
}

// (Las definiciones de AppRole y CustomOrganizationClaims se movieron al inicio)

export default clerkMiddleware(async (auth, req) => {
  // 3. Permitir rutas públicas
  if (isPublicRoute(req)) {
    return NextResponse.next() // Dejar pasar
  }

  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    // 4. Si no está logueado, redirigir a sign-in
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }

  // ---
  // 5. Lógica de Autorización (Roles)
  // ---
  
  // (LÍNEA CORREGIDA)
  // Ya no se necesita "as AppRole" porque TypeScript ahora conoce la forma de 'o'
  const userRole = sessionClaims?.o?.rol
  const { pathname } = req.nextUrl
  
  console.log(`Middleware: Usuario ${userId} con rol '${userRole}' accediendo a ${pathname}`)

  // ---
  // Validación de Rol Válido
  // ---
  const hasValidRole = userRole && VALID_APP_ROLES.includes(userRole);

  if (!hasValidRole) {
    // El usuario ESTÁ LOGUEADO pero no tiene un rol válido
    console.warn(`Usuario ${userId} (rol: '${userRole}') no tiene un rol válido. Redirigiendo a /not-access.`);

    // Evitar bucle de redirección
    if (pathname.startsWith('/not-access')) {
      return NextResponse.next();
    }

    const notAccessUrl = new URL('/not-access', req.url);
    return NextResponse.redirect(notAccessUrl);
  }
  // ---
  // (FIN DE LA VALIDACIÓN)
  // ---

  // 6. Analizar la ruta solicitada (para `roleConfig`)
  const parts = pathname.split('/').filter(Boolean)

  if (parts.length < 2) { 
    // Ej: / ó /company-123
    return NextResponse.next()
  }

  const routeBase = '/' + parts[1]

  // 7. Validar permiso (contra `roleConfig`)
  const requiredRoles = roleConfig[routeBase as keyof typeof roleConfig]

  if (requiredRoles) {
    // Esta ruta SÍ está protegida por roles.
    
    // (userRole! se usa para decirle a TS que ya comprobamos que no es null/undefined)
    if (!requiredRoles.includes(userRole!)) {
      // ¡No tiene permiso para ESTA RUTA!
      const companyId = parts[0]
      const dashboardUrl = new URL(`/${companyId}/dashboard`, req.url)
      dashboardUrl.searchParams.set('error', 'unauthorized')
      
      console.warn(`Acceso denegado: Usuario ${userId} (rol: ${userRole}) intentó acceder a ${pathname}`)
      
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // 8. Dejar pasar
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Omitir internas de Next.js y archivos estáticos
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
// Correr siempre en rutas de API
    '/(api|trpc)(.*)',
  ],
}