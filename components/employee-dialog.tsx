"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Employee, EmployeeDeduction } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2 } from "lucide-react"
import { MonthSelector } from "@/components/month-selector"

interface EmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: Employee
}

export function EmployeeDialog({ open, onOpenChange, employee }: EmployeeDialogProps) {
  const { addEmployee, updateEmployee } = usePayroll()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    cedula: "",
    nombre: "",
    apellido: "",
    fechaIngreso: "",
    salarioBase: "",
    departamento: "",
    cargo: "",
    estado: "activo" as "activo" | "inactivo",
    email: "",
    telefono: "",
    direccion: "",
    deduccionesBancarias: "",
    prestamos: "",
  })
  const [customDeductions, setCustomDeductions] = useState<EmployeeDeduction[]>([])
  const [mesesDeduccionesBancarias, setMesesDeduccionesBancarias] = useState<number[]>([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  ])
  const [mesesPrestamos, setMesesPrestamos] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])

  useEffect(() => {
    if (employee) {
      setFormData({
        cedula: employee.cedula,
        nombre: employee.nombre,
        apellido: employee.apellido,
        fechaIngreso: employee.fechaIngreso,
        salarioBase: employee.salarioBase.toString(),
        departamento: employee.departamento,
        cargo: employee.cargo,
        estado: employee.estado,
        email: employee.email || "",
        telefono: employee.telefono || "",
        direccion: employee.direccion || "",
        deduccionesBancarias: employee.deduccionesBancarias?.toString() || "",
        prestamos: employee.prestamos?.toString() || "",
      })
      setCustomDeductions(employee.otrasDeduccionesPersonalizadas || [])
      setMesesDeduccionesBancarias(employee.mesesDeduccionesBancarias || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
      setMesesPrestamos(employee.mesesPrestamos || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    } else {
      setFormData({
        cedula: "",
        nombre: "",
        apellido: "",
        fechaIngreso: new Date().toISOString().split("T")[0],
        salarioBase: "",
        departamento: "",
        cargo: "",
        estado: "activo",
        email: "",
        telefono: "",
        direccion: "",
        deduccionesBancarias: "",
        prestamos: "",
      })
      setCustomDeductions([])
      setMesesDeduccionesBancarias([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
      setMesesPrestamos([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    }
  }, [employee, open])

  const handleAddCustomDeduction = () => {
    const newDeduction: EmployeeDeduction = {
      id: Math.random().toString(36).substring(2),
      concepto: "",
      monto: 0,
      tipo: "fijo",
      activo: true,
    }
    setCustomDeductions([...customDeductions, newDeduction])
  }

  const handleRemoveCustomDeduction = (id: string) => {
    setCustomDeductions(customDeductions.filter((d) => d.id !== id))
  }

  const handleUpdateCustomDeduction = (id: string, field: keyof EmployeeDeduction, value: any) => {
    setCustomDeductions(customDeductions.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.cedula || !formData.nombre || !formData.apellido || !formData.salarioBase) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    const employeeData = {
      cedula: formData.cedula,
      nombre: formData.nombre,
      apellido: formData.apellido,
      fechaIngreso: formData.fechaIngreso,
      salarioBase: Number.parseFloat(formData.salarioBase),
      departamento: formData.departamento,
      cargo: formData.cargo,
      estado: formData.estado,
      email: formData.email || undefined,
      telefono: formData.telefono || undefined,
      direccion: formData.direccion || undefined,
      deduccionesBancarias: formData.deduccionesBancarias
        ? Number.parseFloat(formData.deduccionesBancarias)
        : undefined,
      mesesDeduccionesBancarias: formData.deduccionesBancarias ? mesesDeduccionesBancarias : undefined,
      prestamos: formData.prestamos ? Number.parseFloat(formData.prestamos) : undefined,
      mesesPrestamos: formData.prestamos ? mesesPrestamos : undefined,
      otrasDeduccionesPersonalizadas: customDeductions.length > 0 ? customDeductions : undefined,
    }

    if (employee) {
      updateEmployee(employee.id, employeeData)
      toast({
        title: "Empleado actualizado",
        description: "La información del empleado ha sido actualizada correctamente",
      })
    } else {
      addEmployee(employeeData)
      toast({
        title: "Empleado agregado",
        description: "El nuevo empleado ha sido agregado al sistema",
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? "Editar Empleado" : "Agregar Nuevo Empleado"}</DialogTitle>
          <DialogDescription>
            {employee
              ? "Modifique la información del empleado"
              : "Complete el formulario para agregar un nuevo empleado"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basico">Información Básica</TabsTrigger>
              <TabsTrigger value="contacto">Contacto</TabsTrigger>
              <TabsTrigger value="deducciones">Deducciones</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cedula">
                    Cédula <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cedula"
                    placeholder="8-123-4567"
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaIngreso">
                    Fecha de Ingreso <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fechaIngreso"
                    type="date"
                    value={formData.fechaIngreso}
                    onChange={(e) => setFormData({ ...formData, fechaIngreso: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    placeholder="Juan"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">
                    Apellido <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="apellido"
                    placeholder="Pérez"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departamento">
                    Departamento <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="departamento"
                    placeholder="Ventas"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">
                    Cargo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cargo"
                    placeholder="Gerente"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salarioBase">
                    Salario Base <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="salarioBase"
                    type="number"
                    step="0.01"
                    placeholder="1500.00"
                    value={formData.salarioBase}
                    onChange={(e) => setFormData({ ...formData, salarioBase: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value: "activo" | "inactivo") => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger id="estado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacto" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="juan.perez@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="6123-4567"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  placeholder="Calle 50, Ciudad de Panamá"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="deducciones" className="space-y-6 py-4">
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deduccionesBancarias">Deducciones Bancarias (B/.)</Label>
                    <Input
                      id="deduccionesBancarias"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.deduccionesBancarias}
                      onChange={(e) => setFormData({ ...formData, deduccionesBancarias: e.target.value })}
                    />
                  </div>
                </div>
                {formData.deduccionesBancarias && Number.parseFloat(formData.deduccionesBancarias) > 0 && (
                  <MonthSelector
                    label="Meses en que se aplica la deducción bancaria"
                    selectedMonths={mesesDeduccionesBancarias}
                    onChange={setMesesDeduccionesBancarias}
                  />
                )}
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prestamos">Préstamos (B/.)</Label>
                    <Input
                      id="prestamos"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.prestamos}
                      onChange={(e) => setFormData({ ...formData, prestamos: e.target.value })}
                    />
                  </div>
                </div>
                {formData.prestamos && Number.parseFloat(formData.prestamos) > 0 && (
                  <MonthSelector
                    label="Meses en que se aplica el préstamo"
                    selectedMonths={mesesPrestamos}
                    onChange={setMesesPrestamos}
                  />
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Otras Deducciones Personalizadas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddCustomDeduction}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>

                {customDeductions.map((deduction) => (
                  <div key={deduction.id} className="space-y-3 p-4 border rounded-lg">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5 space-y-2">
                        <Label className="text-xs">Concepto</Label>
                        <Input
                          placeholder="Ej: Seguro médico"
                          value={deduction.concepto}
                          onChange={(e) => handleUpdateCustomDeduction(deduction.id, "concepto", e.target.value)}
                        />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={deduction.tipo}
                          onValueChange={(value) => handleUpdateCustomDeduction(deduction.id, "tipo", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fijo">Fijo (B/.)</SelectItem>
                            <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label className="text-xs">Monto</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={deduction.monto}
                          onChange={(e) =>
                            handleUpdateCustomDeduction(deduction.id, "monto", Number.parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCustomDeduction(deduction.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <MonthSelector
                      label="Meses en que se aplica esta deducción"
                      selectedMonths={deduction.mesesAplicacion || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
                      onChange={(months) => handleUpdateCustomDeduction(deduction.id, "mesesAplicacion", months)}
                    />
                  </div>
                ))}

                {customDeductions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay deducciones personalizadas. Haga clic en "Agregar" para crear una.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{employee ? "Actualizar" : "Agregar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
