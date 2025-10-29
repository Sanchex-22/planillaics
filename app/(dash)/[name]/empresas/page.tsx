"use client"

import { useState } from "react" // <--- MODIFICADO (ya estaba)
import { usePayroll } from "@/lib/payroll-context"
import { PlusCircle, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Company } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { redirect } from "next/navigation"
import CompanyDialog from "@/components/company-dialog"

export default function EmpresasPage() {
  const { companies, currentCompany, deleteCompany, isLoading, currentUser } = usePayroll()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null) // <--- AÑADIDO: Estado para el error

  const isAdmin = currentUser?.rol === 'super_admin' || currentUser?.rol === 'admin'
  const isSuperAdmin = currentUser?.rol === 'super_admin'

  if (isLoading) {
    return <div className="p-8"><div className="text-center py-20">Cargando...</div></div>
  }

  if (!isAdmin) {
    if (currentCompany) {
      redirect(`/${currentCompany.id}/dashboard`)
    }
    return <div className="p-8"><div className="text-center py-20 text-red-500">Acceso Denegado.</div></div>
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCompany(id)
    } catch (e: any) {
      console.error("Failed to delete company:", e)
      
      let errorMessage = "Ocurrió un error desconocido."
      if (e && e.message) {
        errorMessage = e.message.replace("Error en la operación de la API:", "").trim()
      }
      setDeleteError(errorMessage)
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Compañías</h1>
        <Button onClick={() => { setEditingCompany(null); setIsDialogOpen(true) }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Compañía
        </Button>
      </div>
      <Separator className="mb-6" />

      <CompanyDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        companyToEdit={editingCompany}
        setCompanyToEdit={setEditingCompany}
      />

      <Card>
        <CardHeader>
          <CardTitle>Listado de Compañías ({companies.length})</CardTitle>
          <CardDescription>
            {isSuperAdmin
              ? "Mostrando todas las compañías del sistema."
              : "Mostrando las compañías a las que tienes acceso."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No hay compañías registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.nombre}</TableCell>
                      <TableCell>{company.ruc}</TableCell>
                      <TableCell>{company.email}</TableCell>
                      <TableCell>{company.telefono}</TableCell>
                      <TableCell>
                        <Badge variant={company.activo ? "default" : "secondary"}>
                          {company.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(company)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={company.id === currentCompany?.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar {company.nombre}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción es permanente y eliminará todos los datos asociados (empleados, planillas, etc.) a esta compañía.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(company.id)}
                              >
                                Confirmar Eliminación
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteError} onOpenChange={() => setDeleteError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error al Eliminar</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteError(null)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}