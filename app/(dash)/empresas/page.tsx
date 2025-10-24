// File: app/empresas/page.tsx (AJUSTADO)

"use client"

import { useState } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { PlusCircle, Trash2, Edit, ChevronDown, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import CompanyDialog from "@/components/company-dialog"
import { Company } from "@/lib/types"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"

export default function EmpresasPage() {
  const { companies, selectCompany, deleteCompany, currentCompany } = usePayroll()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCompany(id) // <<-- Cambio: La llamada al contexto ahora es asíncrona
    } catch (e) {
      console.error("Failed to delete company:", e)
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Empresas</h1>
        <Button onClick={() => { setEditingCompany(null); setIsDialogOpen(true) }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Empresa
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
          <CardTitle>Listado de Empresas</CardTitle>
          <CardDescription>
            {companies.length} empresas registradas en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No hay empresas registradas. ¡Agrega una para comenzar!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Representante Legal</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id} className={company.id === currentCompany?.id ? "bg-accent" : ""}>
                      <TableCell className="font-medium">{company.nombre}</TableCell>
                      <TableCell>{company.ruc}</TableCell>
                      <TableCell>{company.representanteLegal || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={company.activo ? "default" : "secondary"}>
                          {company.activo ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem 
                                onClick={() => selectCompany(company.id)}
                                className="cursor-pointer"
                            >
                                {company.id === currentCompany?.id ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" /> Compañía Activa
                                    </>
                                ) : (
                                    <>
                                        <X className="mr-2 h-4 w-4" /> Seleccionar
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(company)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="cursor-pointer text-red-600" onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminarán permanentemente la empresa y todos sus datos relacionados (empleados, planillas, cálculos).
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}