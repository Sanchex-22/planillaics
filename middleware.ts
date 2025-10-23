import { clerkMiddleware, clerkClient, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

// Define las rutas que requieren autenticación general (admin y otros roles).
const isProtectedRoute = createRouteMatcher(['/dashboard/(.*)']);

// Define las rutas que *específicamente* requieren rol de "user" (no "admin").
// Parece que la intención aquí podría ser proteger rutas SOLO para usuarios normales,
// pero la lógica abajo redirige si NO eres admin, lo cual es contradictorio.
const isUserProtectedRoute = createRouteMatcher(['/dashboard/(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Obtiene el userId. Si no existe, auth() redirige automáticamente a la página de login.
  // Nota: auth() por defecto protege TODAS las rutas si no se especifica `publicRoutes`.
  const { userId, redirectToSignIn } = await auth();

  // Si no hay userId después de llamar a auth(), significa que la ruta es pública
  // o algo falló en la configuración inicial de Clerk. En este caso, no hacemos nada más.
  if (!userId) {
    return null; // O podrías retornar NextResponse.next() si quieres ser explícito.
  }
  console.log("User ID autenticado:", userId);

  // Si hay userId, obtenemos los detalles del usuario.
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  // Obtenemos el rol de los metadatos públicos. Si no existe, por defecto es "user".
  const role = (user.publicMetadata.role as string | undefined) ?? "user";

  // PROBLEMA 1: Redirección si NO eres admin para rutas protegidas
  // Si la ruta está en 'isProtectedRoute' (ej. /dashboard/...) Y el rol NO es "admin",
  // redirige al login. Esto significa que usuarios con rol "user" (u otro)
  // serían redirigidos fuera del dashboard, incluso si están logueados.
  if (role !== "admin" && isProtectedRoute(req)) {
    // Si la intención es que SOLO los admins accedan a /dashboard/*, esto es correcto.
    // Si la intención es que CUALQUIER usuario logueado acceda, esta lógica es incorrecta.
    return redirectToSignIn();
  }

  // PROBLEMA 2: Redirección redundante o contradictoria
  // Si el rol es "user" Y la ruta está en 'isUserProtectedRoute' (que es lo mismo que isProtectedRoute),
  // redirige al login. Esto contradice la lógica anterior o es redundante.
  // Si un usuario con rol "user" llega aquí, ya habría sido redirigido por el bloque anterior.
  // Si la intención era proteger rutas *solo* para "user", la lógica `role === "user"`
  // no tiene sentido combinada con `redirectToSignIn`.
  if (role === "user" && isUserProtectedRoute(req)) {
    // Esta condición probablemente nunca se cumpla de forma útil debido al bloque anterior.
    // O si se cumpliera (ej. si quitaras el bloque anterior), redirigiría a los usuarios "user"
    // fuera de las rutas que supuestamente son para ellos.
    return redirectToSignIn();
  }

  // Si ninguna de las condiciones anteriores redirige, la solicitud continúa.
  // IMPORTANTE: Si no especificas `publicRoutes` en clerkMiddleware, Clerk
  // por defecto protege TODAS las rutas. Si quieres rutas públicas (como landing page),
  // debes definirlas.
});

export const config = {
  // El matcher se aplica a TODAS las rutas excepto archivos estáticos y _next.
  // Esto asegura que el middleware se ejecute siempre.
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};