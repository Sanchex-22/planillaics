// lib/data.ts

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/db";
import { redirect } from "next/navigation";

/**
 * Obtiene los datos de sesión y compañía para el layout principal.
 * Maneja la autenticación, permisos y redirecciones.
 */
export async function getLayoutData(companyIdFromUrl: string) {
  const { userId: clerkId, sessionClaims } = await auth();

  // 1. Validar autenticación de Clerk
  if (!clerkId) {
    redirect("/sign-in");
  }

  // 2. Buscar usuario en la DB
  const userInDb = await db.user.findUnique({
    where: { clerkId },
    include: { companias: true },
  });

  // 3. Manejar usuario no encontrado o sin compañías
  if (!userInDb) {
    console.log(`Acceso denegado para clerkId: ${clerkId}. No encontrado en DB.`);
    return { error: "no-access" };
  }

  // 4. Definir roles
  // @ts-ignore
  const userRole = sessionClaims?.o?.rol || userInDb.rol;
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = isSuperAdmin || userRole === 'admin';
  const userCompanyIds = userInDb.companias.map((c) => c.id);

  // 5. Validar acceso a la compañía de la URL (y redirigir si es necesario)
  if (!isSuperAdmin && !userCompanyIds.includes(companyIdFromUrl)) {
    console.log(`Usuario ${clerkId} intentó acceder a ${companyIdFromUrl} sin permiso.`);
    
    // Si no tiene acceso, pero tiene otras compañías, redirigir a la primera
    if (userCompanyIds.length > 0) {
      redirect(`/${userCompanyIds[0]}/dashboard`);
    } else {
      // Si no tiene compañías, no tiene a dónde ir
      return { error: "no-access" };
    }
  }
  
  // 6. Obtener la lista de compañías para el Context Provider
  // (Esta lógica es la que tenías, pero ahora es más claro)
  let companiesForContext: any[];

  if (isSuperAdmin) {
    // Super Admin: Obtener TODAS las compañías
    companiesForContext = await db.company.findMany();
  } else if (isAdmin) {
    // Admin: Usar solo las compañías ASIGNADAS
    companiesForContext = userInDb.companias;
  } else {
    // Contador y User: Usar solo la compañía ACTUAL de la URL
    const currentCompany = userInDb.companias.find(c => c.id === companyIdFromUrl);
    companiesForContext = currentCompany ? [currentCompany] : [];
  }

  // 7. Si después de filtrar no queda nada (y no es super admin), denegar acceso
  if (companiesForContext.length === 0 && !isSuperAdmin) {
     return { error: "no-access" };
  }

  // 8. Formatear los datos para el provider (serializables)
  const initialCompanies = companiesForContext.map(c => ({
    ...c,
    fechaCreacion: c.fechaCreacion.toISOString(),
    email: c.email ?? undefined,
    direccion: c.direccion ?? undefined,
    telefono: c.telefono ?? undefined,
    representanteLegal: c.representanteLegal ?? undefined,
  }));
  
  const initialUser = {
    ...userInDb,
    rol: userRole,
    companias: userInDb.companias.map((c) => ({ id: c.id, nombre: c.nombre })), // Lista simple para el objeto User
    image: userInDb.image ?? undefined,
  };

  // 9. Retornar todos los props necesarios para el layout
  return { 
    initialUser, 
    initialCompanies, 
    currentCompanyId: companyIdFromUrl,
    error: null 
  };
}