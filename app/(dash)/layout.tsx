import type React from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Toaster } from "@/components/ui/toaster";
import { PayrollProvider } from "@/lib/payroll-context";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    console.log("Usuario no autenticado, redirigiendo a /sign-in");
    redirect("/sign-in");
  }
  const user = await currentUser();
  if (!user) return null;
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <PayrollProvider>
          <div className="flex h-screen bg-background overflow-hidden">
            <SidebarNav />
            <main className="flex-1 p-8 overflow-auto">
              <div>
                {children}
              </div>
            </main>
          </div>
        </PayrollProvider>
      </Suspense>
      <Toaster />
    </>
  );
}