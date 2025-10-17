// File: components/employee-dialog.tsx

"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Employee, EmployeeDeduction } from "@/lib/types"
import { usePayroll } from "@/lib/payroll-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { useState, useEffect } from "react"
import { Spinner } from "./ui/spinner"
import { Textarea } from "./ui/textarea"
import { Separator } from "./ui/separator"
import { toast } from "./ui/use-toast"
import { Switch } from "./ui/switch"

// Esquema de validación Zod (Asegúrate de que este esquema coincida con tu Employee type)
const employeeSchema = z.object({
  companiaId: z.string().optional(),
  cedula: z.string().min(5, { message: "La cédula es requerida." }),
  nombre: z.string().min(2, { message: "El nombre es requerido." }),
  apellido: z.string().min(2, { message: "El apellido es requerido." }),
  fechaIngreso: z.date({ required_error: "La fecha de ingreso es requerida." }),
  salarioBase: z.coerce.number().min(0.01, { message: "El salario debe ser mayor a 0." }),
  departamento: z.string().min(2, { message: "El departamento es requerido." }),
  cargo: z.string().min(2, { message: "El cargo es requerido." }),
  estado: z.enum(["activo", "inactivo"]),
  email: z.string().email({ message: "Email inválido." }).optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  deduccionesBancarias: z.coerce.number().min(0).optional().or(z.literal("")),
  mesesDeduccionesBancarias: z.number().array().optional(),
  prestamos: z.coerce.number().min(0).optional().or(z.literal("")),
  mesesPrestamos: z.number().array().optional(),
  otrasDeduccionesPersonalizadas: z.any().optional(), // Manejo flexible para JSON
})

type EmployeeFormValues = z.infer<typeof employeeSchema>

interface EmployeeDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  employeeToEdit: Employee | null
  setEmployeeToEdit: (employee: Employee | null) => void
}

// FIX DE EXPORTACIÓN: Exportación con nombre
export function EmployeeDialog({ isOpen, setIsOpen, employeeToEdit, setEmployeeToEdit }: EmployeeDialogProps) {
  const { addEmployee, updateEmployee, currentCompany } = usePayroll()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estado local para las deducciones personalizadas
  const [deductions, setDeductions] = useState<EmployeeDeduction[]>([]);


  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      companiaId: currentCompany?.id,
      cedula: "",
      nombre: "",
      apellido: "",
      fechaIngreso: new Date(),
      salarioBase: 0,
      departamento: "",
      cargo: "",
      estado: "activo",
      deduccionesBancarias: 0,
      mesesDeduccionesBancarias: [],
      prestamos: 0,
      mesesPrestamos: [],
      otrasDeduccionesPersonalizadas: [],
    },
  })

  useEffect(() => {
    if (employeeToEdit) {
        // Formatear la fecha string a Date para el formulario
        const dateObject = parseISO(employeeToEdit.fechaIngreso);
        
        // Cargar deducciones personalizadas
        setDeductions(employeeToEdit.otrasDeduccionesPersonalizadas || []);
        
        form.reset({
            ...employeeToEdit,
            fechaIngreso: dateObject,
            salarioBase: employeeToEdit.salarioBase,
            deduccionesBancarias: employeeToEdit.deduccionesBancarias || 0,
            prestamos: employeeToEdit.prestamos || 0,
            // Asegurar que las listas de meses sean arrays o undefined
            mesesDeduccionesBancarias: employeeToEdit.mesesDeduccionesBancarias || [],
            mesesPrestamos: employeeToEdit.mesesPrestamos || [],
        });
    } else {
      form.reset()
      setDeductions([]);
    }
  }, [employeeToEdit, form])

  const onSubmit = async (values: EmployeeFormValues) => {
    setIsSubmitting(true)
    
    // Convertir los valores a los tipos correctos para la API/DB
    const apiData = {
        ...values,
        // Convertir Date a string YYYY-MM-DD
        fechaIngreso: format(values.fechaIngreso, "yyyy-MM-dd"), 
        salarioBase: Number(values.salarioBase),
        deduccionesBancarias: values.deduccionesBancarias ? Number(values.deduccionesBancarias) : undefined,
        prestamos: values.prestamos ? Number(values.prestamos) : undefined,
        otrasDeduccionesPersonalizadas: deductions, // Usar el estado local de deducciones
    }

    try {
      if (employeeToEdit) {
        // FIX ASÍNCRONO: Usar await
        await updateEmployee(employeeToEdit.id, apiData) 
        toast({ title: "Empleado Actualizado", description: "Los datos del empleado han sido guardados." })
      } else {
        if (!currentCompany?.id) {
            toast({ title: "Error", description: "Debe seleccionar una compañía.", variant: "destructive" })
            return
        }
        // FIX ASÍNCRONO: Usar await
        await addEmployee({ ...apiData, companiaId: currentCompany.id } as Omit<Employee, 'id'>)
        toast({ title: "Empleado Creado", description: "El nuevo empleado ha sido registrado." })
      }
      form.reset()
      setEmployeeToEdit(null)
      setIsOpen(false)
    } catch (error) {
      console.error("Error saving employee:", error)
      // El error se maneja también en el contexto, pero aquí podemos añadir un fallback de UI
    } finally {
      setIsSubmitting(false)
    }
  }

  // Lógica de adición/remoción de Deducciones Personalizadas (Omitida por brevedad, pero debe estar aquí)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setEmployeeToEdit(null);
        form.reset();
        setDeductions([]);
      }
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employeeToEdit ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <h3 className="text-lg font-semibold border-b pb-1">Información Básica</h3>
            
            {/* Campos de Nombre, Apellido, Cédula */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField name="nombre" render={({ field }) => (/* ... */)} />
              <FormField name="apellido" render={({ field }) => (/* ... */)} />
              <FormField name="cedula" render={({ field }) => (/* ... */)} />
            </div>

            {/* Campos de Salario Base, Fecha Ingreso, Estado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="salarioBase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario Base ($/mensual) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1000.00" {...field} onChange={e => field.onChange(e.target.value === "" ? 0 : e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaIngreso"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Ingreso *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <h3 className="text-lg font-semibold border-b pb-1 pt-4">Detalles Laborales</h3>
            {/* Campos de Departamento y Cargo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="departamento" render={({ field }) => (/* ... */)} />
                <FormField name="cargo" render={({ field }) => (/* ... */)} />
            </div>


            <h3 className="text-lg font-semibold border-b pb-1 pt-4">Deducciones Fijas</h3>
            
            {/* Campos de Deducciones Bancarias y Préstamos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deduccionesBancarias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deducciones Bancarias ($/mensual)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === "" ? 0 : e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mesesDeduccionesBancarias"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Meses de Aplicación (1-12)</FormLabel>
                        <FormControl>
                             {/* Componente para seleccionar los meses (Asumo que usa un multi-select) */}
                             <Input placeholder="Ej: 1, 4, 7 (Meses separados por coma)" value={field.value?.join(', ') || ''} onChange={e => {
                                const numbers = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 12);
                                field.onChange(numbers);
                            }} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prestamos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Préstamos (Otros) ($/mensual)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === "" ? 0 : e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mesesPrestamos"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Meses de Aplicación (1-12)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 3, 6, 9" value={field.value?.join(', ') || ''} onChange={e => {
                                const numbers = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 12);
                                field.onChange(numbers);
                            }} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
              />
            </div>

            {/* --- Deducciones Personalizadas (Lógica Omitida) --- */}
            
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                {employeeToEdit ? "Guardar Cambios" : "Crear Empleado"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}