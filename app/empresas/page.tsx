"use client"

import { usePayroll } from "@/lib/payroll-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Building2, Edit, CheckCircle, XCircle } from "lucide-react"
import { useState } from "react"
import { CompanyDialog } from "@/components/company-dialog"
import type { Company } from "@/lib/types"

export default function EmpresasPage() {
  const { companies, currentUser, isHydrated } = usePayroll()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen bg-background">
        <aside className="w-64 border-r border-border bg-card">
          <SidebarNav />
        </aside>
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gestión de Empresas</h1>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </main>
      </div>
    )
  }

  if (currentUser?.rol !== "super_admin") {
    return (
      <div className="flex min-h-screen bg-background">
        <aside className="w-64 border-r border-border bg-card">
          <SidebarNav />
        </aside>
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Acceso Denegado</h1>
            <p className="text-muted-foreground">No tiene permisos para acceder a esta página</p>
          </div>
        </main>
      </div>
    )
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCompany(null)
    setIsDialogOpen(true)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card">
        <SidebarNav />
      </aside>
      <main className="flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Empresas</h1>
            <p className="text-muted-foreground">Administre las empresas del sistema</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Empresa
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{company.nombre}</CardTitle>
                  </div>
                  {company.activo ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <CardDescription>{company.ruc || "Sin RUC"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {company.direccion && (
                    <div>
                      <span className="font-medium">Dirección:</span> {company.direccion}
                    </div>
                  )}
                  {company.telefono && (
                    <div>
                      <span className="font-medium">Teléfono:</span> {company.telefono}
                    </div>
                  )}
                  {company.email && (
                    <div>
                      <span className="font-medium">Email:</span> {company.email}
                    </div>
                  )}
                  {company.representanteLegal && (
                    <div>
                      <span className="font-medium">Representante:</span> {company.representanteLegal}
                    </div>
                  )}
                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(company)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {companies.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No hay empresas registradas</p>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Primera Empresa
              </Button>
            </CardContent>
          </Card>
        )}

        <CompanyDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          company={editingCompany}
          onClose={() => {
            setIsDialogOpen(false)
            setEditingCompany(null)
          }}
        />
      </main>
    </div>
  )
}
