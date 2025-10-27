// clerk.d.ts

// Define el tipo para tu rol
type AppRole = 'super_admin' | 'admin' | 'moderator' | 'user' | string | null | undefined;

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

// ¡ESTO ES MUY IMPORTANTE!
// Esto convierte el archivo en un "módulo" de TypeScript,
// lo cual es necesario para que `declare global` funcione correctamente.
export {};