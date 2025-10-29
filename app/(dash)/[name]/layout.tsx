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

// --- CAMBIO 1: Acepta 'props' en lugar de desestructurar { children, params }
export default async function Layout(
  props: Readonly<{
    children: React.ReactNode;
    params: { name: string };
  }>
) {
  const { children, params } = props;

  const { 
    initialUser, 
    initialCompanies, 
    currentCompanyId, 
    error 
  } = await getLayoutData(params?.name);

  if (error === 'no-access' || !initialUser || !initialCompanies) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <NoAccessPage />
        <Toaster />
      </div>
    );
  }

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