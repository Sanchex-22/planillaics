"use client"

import { usePayroll } from "@/lib/payroll-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function ConfiguracionPage() {
  const { currentUser, isHydrated } = usePayroll()

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </main>
      </div>
    )
  }

  if (currentUser?.rol !== "super_admin") {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Acceso Denegado</h1>
            <p className="text-muted-foreground">No tiene permisos para acceder a esta página</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configuración del Sistema</h1>
          <p className="text-muted-foreground">Configuración global del sistema de planilla</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>Ajustes generales del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auditoría de Cambios</Label>
                  <p className="text-sm text-muted-foreground">Registrar todos los cambios en el sistema</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificaciones de planilla por correo</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo de Desarrollo</Label>
                  <p className="text-sm text-muted-foreground">Habilitar funciones de desarrollo y debug</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
              <CardDescription>Configuración de seguridad y acceso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticación de Dos Factores</Label>
                  <p className="text-sm text-muted-foreground">Requerir 2FA para todos los usuarios</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sesiones Múltiples</Label>
                  <p className="text-sm text-muted-foreground">Permitir múltiples sesiones por usuario</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
