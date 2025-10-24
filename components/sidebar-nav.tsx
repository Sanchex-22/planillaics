"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Calculator,
  FileText,
  Settings,
  Calendar,
  DollarSign,
  Building2,
  Receipt,
  LogOutIcon,
} from "lucide-react"
import { CompanySelector } from "@/components/company-selector"
import { usePayroll } from "@/lib/payroll-context"
import { useClerk } from "@clerk/nextjs"
import { Skeleton } from "@/components/ui/skeleton"

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["super_admin", "contador"],
  },
  {
    title: "Empleados",
    href: "/empleados",
    icon: Users,
    roles: ["super_admin", "contador"],
  },
  {
    title: "Calcular Planilla",
    href: "/calcular-planilla",
    icon: Calculator,
    roles: ["super_admin", "contador"],
  },
  {
    title: "Décimo Tercer Mes",
    href: "/decimo-tercer-mes",
    icon: Calendar,
    roles: ["super_admin", "contador"],
  },
  {
    title: "Impuesto Sobre la Renta",
    href: "/impuesto-sobre-renta",
    icon: Receipt,
    roles: ["super_admin", "contador"],
  },
  {
    title: "Pagos SIPE",
    href: "/pagos-sipe",
    icon: DollarSign,
    roles: ["super_admin", "contador"],
  },
  {
    title: "Reportes",
    href: "/reportes",
    icon: FileText,
    roles: ["super_admin", "contador"],
  },
  {
    title: "Parámetros Legales",
    href: "/parametros",
    icon: Settings,
    roles: ["super_admin"],
  },
  {
    title: "Gestión de Empresas",
    href: "/empresas",
    icon: Building2,
    roles: ["super_admin"],
  },
  {
    title: "Configuración",
    href: "/configuracion",
    icon: Settings,
    roles: ["super_admin"],
  },
]

export function SidebarNav() {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { user } = useClerk()
  const { currentUser, isHydrated } = usePayroll()

  const visibleNavItems = navItems.filter((item) => {
    if (!currentUser) return false
    return item.roles.includes(currentUser.rol)
  })

  if (!isHydrated) {
    return (
      <nav className="flex h-screen flex-col border-r border-border/40 bg-background">
        {/* Header */}
        <div className="border-b border-border/40 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none text-foreground">Sistema de Planilla</h1>
              <p className="mt-1 text-xs text-muted-foreground">Cargando...</p>
            </div>
          </div>
        </div>

        {/* Company Selector */}
        <div className="border-b border-border/40 p-4">
          <CompanySelector />
        </div>

        {/* Navigation Skeleton */}
        <div className="flex-1 space-y-1 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg px-3 py-2.5">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      </nav>
    )
  }

  return (
    <nav className="flex h-screen flex-col border-r border-border/40 bg-background">
      <div className="border-b border-border/40 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none text-foreground">Sistema de Planilla</h1>
            <p className="mt-1 text-xs text-muted-foreground">Gestión de Nómina</p>
          </div>
        </div>
      </div>

      <div className="border-b border-border/40 p-4">
        <CompanySelector />
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive ? "scale-110" : "group-hover:scale-105",
                )}
              />
              <span className="leading-none">{item.title}</span>
            </Link>
          )
        })}
      </div>

      <div className="border-t border-border/40 bg-muted/30">
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors duration-200 hover:bg-accent/50">
            <div className="relative">
              <img
                src={user?.imageUrl || "/default-avatar.png"}
                alt="User avatar"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border-2 border-border/40 bg-background object-cover"
              />
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-sm font-semibold leading-none text-foreground">
                {user?.firstName || "Usuario"}
              </p>
              <p className="mt-1.5 truncate text-xs leading-none text-muted-foreground">
                {user?.emailAddresses[0]?.emailAddress || "email@example.com"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 p-3">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors duration-200 hover:bg-destructive/10"
          >
            <LogOutIcon className="h-5 w-5" />
            <span className="leading-none">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
