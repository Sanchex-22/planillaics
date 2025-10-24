import type React from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Toaster } from "@/components/ui/toaster";
import { PayrollProvider } from "@/lib/payroll-context";
import { Children, Suspense } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    console.log("Usuario no autenticado, redirigiendo a /sign-in");
    redirect("/sign-in");
  };
  const user = await currentUser();
  if (!user) return null;
  return (
    <>
          <Suspense fallback={<div>Loading...</div>}>
            <PayrollProvider>
              <div className="flex min-h-screen bg-background">
                <aside className="w-64 border-r border-border bg-card">
                  <SidebarNav />
                  PD: Aquí podrías poner el botón de usuario de Clerk 
                    para que aparezca en el sidebar cuando esté logueado.
                    
                    <div className="p-4 mt-auto border-t">
                    </div>
                 
                </aside>

                <main className="flex-1 p-8">{children}</main>
              </div>
            </PayrollProvider>
          </Suspense>
          <Toaster />
    </>
  );
}
