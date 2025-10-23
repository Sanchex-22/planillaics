// File: components/sidebar-nav.tsx (CORREGIDO)

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
  Loader2,
  LogOutIcon,
} from "lucide-react"
import { CompanySelector } from "./company-selector"
import { usePayroll } from "@/lib/payroll-context"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { SignOutButton, useClerk } from "@clerk/nextjs"
import LogoutButton from "./LogoutButton"

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
    const { signOut } = useClerk();
  // Se añade 'isHydrated' para saber cuándo el contexto terminó de cargar datos iniciales.
  const { currentUser, isHydrated } = usePayroll()

  const visibleNavItems = navItems.filter((item) => {
    // Si no hay usuario (aún cargando o no logueado), no mostramos rutas, excepto la de carga.
    if (!currentUser) return false
    return item.roles.includes(currentUser.rol)
  })

  // Si no está hidratado Y no tenemos el usuario, mostramos un esqueleto.
  if (!isHydrated) {
    return (
      <nav className="flex flex-col gap-2 p-4 h-screen">
        <div className="mb-6 px-3">
          <h1 className="text-xl font-bold text-foreground">Sistema de Planilla</h1>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
        <div className="mb-4 px-3">
          {/* CompanySelector ya maneja su propio estado de carga */}
          <CompanySelector />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-3 py-2">
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </nav>
    )
  }
  
  // Una vez hidratado, si no hay usuario o no hay rutas visibles, mostramos un mensaje (O si tuvieras auth real, redirigirías).

  return (
    <nav className="flex flex-col gap-2 p-4 min-h-screen">
      <div className="mb-6 px-3">
        <h1 className="text-xl font-bold text-foreground">Sistema de Planilla</h1>
        <p className="text-sm text-muted-foreground">Gestión de Nómina</p>
      </div>

      <div className="mb-4 px-3">
        {/* CompanySelector usa usePayroll y se renderizará correctamente */}
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

      {/* {currentUser && (
        <div className="mt-auto pt-4 border-t border-border">
          <div className="px-3">
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{currentUser.nombre}</p>
                <p className="capitalize">{currentUser.rol.replace("_", " ")}</p>
              </div>
          </div>
        </div>
      )} */}

      <div
        className="flex w-full cursor-pointer items-center gap-1 rounded-b-md px-4 py-4 text-center duration-200 hover:text-red-400"
        onClick={() => signOut()}
      >
        <LogOutIcon className="text-red-500" size={18} />
        <p className="text-xs font-semibold uppercase tracking-widest text-red-500">
          Logout
        </p>
      </div>
      <SignOutButton/>
    </nav>
  )
}