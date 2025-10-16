"use client"

import { useState } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Pencil, Trash2, Upload } from "lucide-react"
import { EmployeeDialog } from "@/components/employee-dialog"
import { ExcelImportDialog } from "@/components/excel-import-dialog"
import type { Employee } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function EmpleadosPage() {
  const { employees, deleteEmployee, clearAllEmployees } = usePayroll()
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [excelDialogOpen, setExcelDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null)
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false)

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cedula.includes(searchTerm) ||
      emp.departamento.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setEmployeeToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (employeeToDelete) {
      deleteEmployee(employeeToDelete)
      setEmployeeToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  const confirmClearAll = () => {
    clearAllEmployees()
    setClearAllDialogOpen(false)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingEmployee(undefined)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card">
        <SidebarNav />
      </aside>
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gestión de Empleados</h1>
          <p className="text-muted-foreground">Administre la información de todos los empleados</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Empleados</CardTitle>
                <CardDescription>Total de empleados: {employees.length}</CardDescription>
              </div>
              <div className="flex gap-2">
                {employees.length > 0 && (
                  <Button variant="destructive" onClick={() => setClearAllDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Borrar Todos
                  </Button>
                )}
                <Button variant="outline" onClick={() => setExcelDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Excel
                </Button>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Empleado
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, cédula o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Salario Base</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No se encontraron empleados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-mono">{employee.cedula}</TableCell>
                        <TableCell className="font-medium">
                          {employee.nombre} {employee.apellido}
                        </TableCell>
                        <TableCell>{employee.departamento}</TableCell>
                        <TableCell>{employee.cargo}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${employee.salarioBase.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.estado === "activo" ? "default" : "secondary"}>
                            {employee.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(employee.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <EmployeeDialog open={dialogOpen} onOpenChange={handleDialogClose} employee={editingEmployee} />
        <ExcelImportDialog open={excelDialogOpen} onOpenChange={setExcelDialogOpen} />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El empleado será eliminado permanentemente del sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Borrar TODOS los empleados?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminarán permanentemente TODOS los empleados ({employees.length}
                ), sus planillas, cálculos de décimo y pagos SIPE de esta empresa. ¿Está completamente seguro?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmClearAll} className="bg-destructive text-destructive-foreground">
                Sí, Borrar Todo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
