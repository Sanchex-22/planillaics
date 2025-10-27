// app/(dash)/[name]/layout.tsx

import type React from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Toaster } from "@/components/ui/toaster";
import { PayrollProvider } from "@/lib/payroll-context";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/db";
import { NoAccessPage } from "@/components/no-access-page";

export default async function Layout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { name: string }; // 'name' es el ID de la compañía en la URL
}>) {
  // 1. Obtener el clerkId del usuario autenticado
  const { userId: clerkId } = await auth();
  const companyIdFromUrl = params.name;

  if (!clerkId) {
    redirect("/sign-in");
  }

  // 2. Buscar al usuario en TU base de datos (Prisma)
  const userInDb = await db.user.findUnique({
    where: {
      clerkId: clerkId,
    },
    include: {
      companias: true, // Pedimos los objetos completos de las compañías
    },
  });

  // 3. Lógica de Autorización
  // CASO B: Usuario no existe en DB o no tiene compañías asignadas
  if (!userInDb || userInDb.companias.length === 0) {
    console.log(`Acceso denegado para clerkId: ${clerkId}. No encontrado en DB o sin compañías.`);
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <NoAccessPage />
        <Toaster />
      </div>
    );
  }

  // CASO A: El usuario existe y tiene compañías
  const userCompanyIds = userInDb.companias.map((c) => c.id);

  // 4. Validar si tiene acceso a la compañía de la URL
  if (!userCompanyIds.includes(companyIdFromUrl)) {
    console.log(`Usuario ${clerkId} intentó acceder a ${companyIdFromUrl} sin permiso.`);
    const firstCompanyId = userInDb.companias[0].id;
    redirect(`/${firstCompanyId}/dashboard`);
  }

  // ¡ÉXITO! El usuario puede ver esta página.
  
  // ----- INICIO DE LA CORRECCIÓN -----
  // Transformamos los datos de Prisma para que coincidan con los tipos del Context

  // 1. Transformamos las compañías (Prisma Date -> string, Prisma null -> undefined)
  // Esto soluciona el error en 'initialCompanies'
  const initialCompanies = userInDb.companias.map(c => ({
    ...c,
    // (A) Convertir Date a string (NUEVO CAMBIO)
    fechaCreacion: c.fechaCreacion.toISOString(), 
    
    // (B) Convertir null a undefined (CAMBIO ANTERIOR)
    email: c.email ?? undefined,
    direccion: c.direccion ?? undefined,
    telefono: c.telefono ?? undefined,
    representanteLegal: c.representanteLegal ?? undefined,
  }));

  // 2. Transformamos el objeto de usuario
  // Esto soluciona el error en 'initialUser'
  const initialUser = {
    ...userInDb,
    // (A) Hacemos una aserción de tipo para 'rol' (CAMBIO ANTERIOR)
    rol: userInDb.rol as ("super_admin" | "contador"), 
    
    // (B) Pasamos solo los IDs de las compañías (NUEVO CAMBIO)
    companias: userInDb.companias.map(c => c.id), 
  };
  // ----- FIN DE LA CORRECCIÓN -----


  // Ahora pasamos los datos YA TRANSFORMADOS al Provider.
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <PayrollProvider
          initialUser={initialUser}
          initialCompanies={initialCompanies}
          currentCompanyId={companyIdFromUrl}
        >
          <div className="flex h-screen bg-background overflow-hidden">
            <SidebarNav />
            <main className="flex-1 p-8 overflow-auto">
              <div>{children}</div>
            </main>
          </div>
        </PayrollProvider>
      </Suspense>
      <Toaster />
    </>
  );
}