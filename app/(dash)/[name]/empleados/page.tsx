"use client"

import { useState, useMemo } from "react"
import { usePayroll } from "@/lib/payroll-context"
// FIX IMPORTS: Añadidos Eye y EyeOff
import { PlusCircle, Trash2, Edit, FileInput, Eye, EyeOff } from "lucide-react" 
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Employee } from "@/lib/types"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { ExcelImportDialog } from "@/components/excel-import-dialog" 
import { EmployeeDialog } from "@/components/employee-dialog"


export default function EmpleadosPage() {
  const { employees, currentCompany, deleteEmployee, clearAllEmployees, isLoading } = usePayroll()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false) 
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  
  // ESTADO CLAVE: Controla la visibilidad de los salarios
  const [showSalaries, setShowSalaries] = useState(false) 

  const activeEmployees = useMemo(() => employees.filter(e => e.estado === 'activo'), [employees])
  const inactiveEmployees = useMemo(() => employees.filter(e => e.estado === 'inactivo'), [employees])

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee(id) 
    } catch (e) {
      console.error("Failed to delete employee:", e)
    }
  }

  const handleClearAll = async () => {
    if (!currentCompany) return
    try {
      await clearAllEmployees()
    } catch (e) {
      console.error("Failed to clear all employees:", e)
    }
  }

  if (isLoading) {
    return <div className="p-8"><div className="text-center py-20">Cargando datos de empleados...</div></div>
  }

  if (!currentCompany) {
    return <div className="p-8"><div className="text-center py-20 text-muted-foreground">Por favor, seleccione una compañía para gestionar los empleados.</div></div>
  }


  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
        <div className="space-x-2">
            {/* BOTÓN DE IMPORTACIÓN */}
            <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
                <FileInput className="mr-2 h-4 w-4" />
                Importar Excel
            </Button>
            <Button onClick={() => { setEditingEmployee(null); setIsDialogOpen(true) }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Empleado
            </Button>
        </div>
      </div>
      <Separator className="mb-6" />

      <EmployeeDialog 
        isOpen={isDialogOpen} 
        setIsOpen={setIsDialogOpen} 
        employeeToEdit={editingEmployee} 
        setEmployeeToEdit={setEditingEmployee}
      />
      
      {/* DIÁLOGO DE IMPORTACIÓN */}
      <ExcelImportDialog 
        isOpen={isImportDialogOpen} 
        setIsOpen={setIsImportDialogOpen}
      />

      <Card>
        <CardHeader>
          <CardTitle>Listado de Empleados ({employees.length})</CardTitle>
          <CardDescription>
            Empleados activos: {activeEmployees.length} | Inactivos: {inactiveEmployees.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No hay empleados registrados. ¡Agrega uno para comenzar!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Cargo/Depto</TableHead>
                    
                    {/* CABECERA CORREGIDA: Salario Base con botón de visibilidad */}
                    <TableHead>
                        <div className="flex items-center space-x-1">
                            <span>Salario Base</span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setShowSalaries(prev => !prev)}
                                className="h-6 w-6"
                            >
                                {showSalaries ? 
                                    <Eye className="h-4 w-4 text-muted-foreground" /> : 
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                }
                            </Button>
                        </div>
                    </TableHead>
                    
                    <TableHead>Fecha Ingreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.cedula}</TableCell>
                      <TableCell>{employee.nombre} {employee.apellido}</TableCell>
                      <TableCell>{employee.cargo} ({employee.departamento})</TableCell>
                      
                      {/* CELDA CORREGIDA: Mostrar máscara o valor real */}
                      <TableCell className="font-mono">
                          {showSalaries ? formatCurrency(employee.salarioBase) : '***'}
                      </TableCell>

                      <TableCell>{format(new Date(employee.fechaIngreso), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={employee.estado === 'activo' ? "default" : "secondary"}>
                          {employee.estado === 'activo' ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar a {employee.nombre}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará al empleado y todos sus registros de planilla, décimo, etc. ¿Desea continuar?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700" 
                                onClick={() => handleDelete(employee.id)}
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
      
      {/* Botón de Eliminación Masiva */}
      {employees.length > 0 && (
        <div className="mt-6 flex justify-end">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar TODOS los Empleados
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ADVERTENCIA: ¿Eliminar TODOS los Empleados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción NO se puede deshacer. Se eliminarán permanentemente **TODOS** los {employees.length} empleados y sus datos históricos de la compañía {currentCompany.nombre}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-600 hover:bg-red-700" 
                        onClick={handleClearAll}
                      >
                        CONFIRMAR Eliminación Masiva
                      </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      )}

    </div>
  )
}
