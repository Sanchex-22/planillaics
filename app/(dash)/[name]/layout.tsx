// app/(dash)/[name]/layout.tsx

import type React from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Toaster } from "@/components/ui/toaster";
import { PayrollProvider } from "@/lib/payroll-context";
import { UserProvider } from "@/lib/user-context";
import { Suspense } from "react";
import { NoAccessPage } from "@/components/no-access-page";
import { getLayoutData } from "@/lib/data";
import Loader from "@/components/loaders/loader";

export default async function Layout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { name: string };
}>) {

  // 2. LLAMAR A LA FUNCIÓN DE LÓGICA
  const { 
    initialUser, 
    initialCompanies, 
    currentCompanyId, 
    error 
  } = await getLayoutData(params.name);

  // 3. MANEJAR EL CASO DE NO ACCESO
  if (error === 'no-access' || !initialUser || !initialCompanies) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <NoAccessPage />
        <Toaster />
      </div>
    );
  }

  // 4. RENDERIZAR (todo igual que antes)
  return (
    <>
      <Suspense fallback={<div className="h-screen"><Loader/></div>}>
        <PayrollProvider
          initialUser={initialUser}
          initialCompanies={initialCompanies}
          currentCompanyId={currentCompanyId}
        >
          <UserProvider>
            <div className="flex h-screen bg-background overflow-hidden">
              <SidebarNav />
              <main className="flex-1 p-8 overflow-auto">
                <div>{children}</div>
              </main>
            </div>
          </UserProvider>
        </PayrollProvider>
      </Suspense>
      <Toaster />
    </>
  );
}