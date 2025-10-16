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
} from "lucide-react"
import { CompanySelector } from "./company-selector"
import { usePayroll } from "@/lib/payroll-context"

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
    roles: ["super_admin", "contador"],
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
  const { currentUser } = usePayroll()

  const visibleNavItems = navItems.filter((item) => {
    if (!currentUser) return false
    return item.roles.includes(currentUser.rol)
  })

  return (
    <nav className="flex flex-col gap-2 p-4 h-screen">
      <div className="mb-6 px-3">
        <h1 className="text-xl font-bold text-foreground">Sistema de Planilla</h1>
        <p className="text-sm text-muted-foreground">Gestión de Nómina</p>
      </div>

      <div className="mb-4 px-3">
        <CompanySelector />
      </div>

      {visibleNavItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.title}
          </Link>
        )
      })}

      <div className="mt-auto pt-4 border-t border-border">
        <div className="px-3">
          {currentUser && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{currentUser.nombre}</p>
              <p className="capitalize">{currentUser.rol.replace("_", " ")}</p>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
