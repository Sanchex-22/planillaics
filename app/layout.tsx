// Imports de React y Next.js
import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { ClerkProvider, SignedIn, UserButton } from '@clerk/nextjs'
// Estilos Globales
import "./globals.css";
import DashboardLayout from "./(dashboard)/dashboardLayout";

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
          {children}
          {/* <DashboardLayout> {children}</DashboardLayout> */}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}