// Imports de React y Next.js
import type React from "react";
import type { Metadata } from "next";
import { Suspense } from "react";

// Imports de Terceros (Clerk, Geist, Vercel)
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";

// Imports de Componentes Locales
import { Toaster } from "@/components/ui/toaster";
import { SidebarNav } from "@/components/sidebar-nav";

// Imports de Contexto/Librerías Locales
import { PayrollProvider } from "@/lib/payroll-context";

// Estilos Globales
import "./globals.css";

// Metadata de la página
export const metadata: Metadata = {
  title: "Sistema de Planilla - Panamá",
  description: "Sistema completo de gestión de nómina y planilla para Panamá",
  generator: "v0.app",
};

// Layout Principal
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body
          className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
        >
          <Suspense fallback={<div>Loading...</div>}>
            <PayrollProvider>
              <div className="flex min-h-screen bg-background">
                <aside className="w-64 border-r border-border bg-card">
                  <SidebarNav />
                  {/* PD: Aquí podrías poner el botón de usuario de Clerk 
                    para que aparezca en el sidebar cuando esté logueado.
                    
                    <div className="p-4 mt-auto border-t">
                      <SignedIn>
                        <UserButton />
                      </SignedIn>
                      <SignedOut>
                        <SignInButton />
                      </SignedOut>
                    </div>
                  */}
                </aside>

                <main className="flex-1 p-8">{children}</main>
              </div>
            </PayrollProvider>
          </Suspense>

          {/* Componentes globales fuera del layout principal */}
          <Toaster />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}