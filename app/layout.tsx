import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { PayrollProvider } from "@/lib/payroll-context"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Sistema de Planilla - Panamá",
  description: "Sistema completo de gestión de nómina y planilla para Panamá",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <PayrollProvider>{children}</PayrollProvider>
        </Suspense>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
