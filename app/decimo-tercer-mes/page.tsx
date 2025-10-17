// File: app/decimo-tercer-mes/page.tsx

"use client"

import { useState, useMemo, useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { DecimoTercerMes } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Save, Trash2 } from "lucide-react"
import { format } from "date-fns"
// FIX IMPORT: Usar Named Imports
import { MonthSelector } from "@/components/month-selector"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"


// Interfaz para el cálculo temporal (puede ser DecimoTercerMes, pero le añadimos el nombre del empleado)
interface CalculatedDecimo extends DecimoTercerMes {
  employeeName: string
}

export default function DecimoTercerMesPage() {
  const {
    currentCompany,
    employees,
    payrollEntries,
    legalParameters,
    isrBrackets,
    decimoEntries,
    saveDecimoEntries,
    deleteYearDecimo,
    currentYear,
    selectYear,
    calculateDecimoApi, // Nueva función de cálculo de API
    isLoading
  } = usePayroll()

  const [calculatedDecimos, setCalculatedDecimos] = useState<CalculatedDecimo[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const entriesForCurrentYear = useMemo(() => decimoEntries.filter(e => e.anio === currentYear), [decimoEntries, currentYear])
  const isYearClosed = entriesForCurrentYear.length > 0 && entriesForCurrentYear.every(e => e.estado === 'pagado_completo')

  // Efecto para sincronizar los cálculos con las entradas existentes
  useEffect(() => {
    if (entriesForCurrentYear.length > 0) {
      const syncedData: CalculatedDecimo[] = entriesForCurrentYear.map(e => ({
        ...e,
        employeeName: employees.find(emp => emp.id === e.empleadoId)?.nombre || 'Empleado Desconocido'
      })).filter(e => e.employeeName !== 'Empleado Desconocido')
      setCalculatedDecimos(syncedData)
    } else {
      setCalculatedDecimos([])
    }
  }, [entriesForCurrentYear, employees])

  const handleCalculateDecimo = async () => {
    if (!currentCompany || employees.length === 0) {
      toast({ title: "Advertencia", description: "No hay empleados o compañía seleccionada.", variant: "warning" })
      return
    }

    setIsCalculating(true)
    const newCalculations: CalculatedDecimo[] = []

    try {
      for (const employee of employees.filter(e => e.estado === 'activo')) {
        // FIX ASÍNCRONO: Usar await para la llamada a la API de cálculo
        const result = await calculateDecimoApi(employee.id, currentYear) 

        const decimoEntry: CalculatedDecimo = {
          ...result,
          employeeName: `${employee.nombre} ${employee.apellido}`,
          companiaId: currentCompany.id,
          empleadoId: employee.id,
          anio: currentYear,
          fechaCalculo: new Date().toISOString(),
          estado: 'calculado', // Estado inicial
        }
        newCalculations.push(decimoEntry)
      }

      setCalculatedDecimos(newCalculations)
      toast({ title: "Cálculo Completo", description: `Se calcularon ${newCalculations.length} décimos para el año ${currentYear}.`, variant: "success" })

    } catch (e) {
      console.error("Error calculating décimo:", e)
      toast({ title: "Error", description: "Fallo el cálculo del Décimo Tercer Mes. Verifique la consola.", variant: "destructive" })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleSaveDecimo = async (estado: 'pagado_parcial' | 'pagado_completo') => {
    if (calculatedDecimos.length === 0 || !currentCompany) return

    setIsSaving(true)
    try {
      const entriesToSave: DecimoTercerMes[] = calculatedDecimos.map((calc) => ({
        ...calc,
        estado: estado,
        id: entriesForCurrentYear.find(e => e.empleadoId === calc.empleadoId)?.id || `temp-${calc.empleadoId}`,
        // El resto de campos ya están correctamente tipados.
      }))

      // FIX ASÍNCRONO: Usar await para la persistencia
      await saveDecimoEntries(entriesToSave)
      
      toast({ title: "Guardado Exitoso", description: `El Décimo se guardó como ${estado}.`, variant: "success" })
    } catch (e) {
      console.error("Error saving décimo:", e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearDecimo = async () => {
    if (entriesForCurrentYear.length === 0) return
    try {
      // FIX ASÍNCRONO: Usar await para la eliminación
      await deleteYearDecimo(currentYear)
      setCalculatedDecimos([])
    } catch (e) {
      console.error("Error clearing décimo:", e)
    }
  }
  
  if (!currentCompany) {
    return <div className="p-8"><div className="text-center py-20 text-muted-foreground">Por favor, seleccione una compañía para calcular el Décimo Tercer Mes.</div></div>
  }
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Cálculo de Décimo Tercer Mes</h1>
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            
            {/* Selector de Año */}
            <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Año de Cálculo</label>
                <MonthSelector 
                    selectedMonth={`${currentYear}-01`} 
                    onMonthChange={(month) => selectYear(parseInt(month.slice(0, 4)))} 
                    mode="year"
                />
            </div>
            
            <Button 
                onClick={handleCalculateDecimo} 
                disabled={isCalculating || !currentCompany || employees.length === 0 || isYearClosed}
                className="ml-auto min-w-[150px]"
            >
                {isCalculating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Check className="mr-2 h-4 w-4" />
                )}
                {isCalculating ? "Calculando..." : "Calcular Décimo"}
            </Button>
            
          </div>

          <p className="text-sm text-muted-foreground pt-2">
            Año de cálculo: <Badge variant="secondary" className="font-mono">{currentYear}</Badge>
            {entriesForCurrentYear.length > 0 && (
                <span className="ml-4">
                    Estado: <Badge variant={isYearClosed ? "success" : "default"}>{isYearClosed ? "Pagado Completo" : "Cálculo Existente"}</Badge>
                </span>
            )}
          </p>
          
        </CardContent>
      </Card>
      
      {/* Botones de Guardado */}
      {calculatedDecimos.length > 0 && (
        <div className="flex justify-end space-x-4 mt-6">
          <Button 
            onClick={() => handleSaveDecimo('pagado_parcial')}
            variant="outline"
            disabled={isSaving || isYearClosed}
          >
            {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar como Pago Parcial
          </Button>
          
          <Button 
            onClick={() => handleSaveDecimo('pagado_completo')}
            variant="default"
            disabled={isSaving || isYearClosed}
          >
            {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Check className="mr-2 h-4 w-4" />}
            Guardar como Pago Completo
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button 
                    variant="destructive" 
                    disabled={isSaving || entriesForCurrentYear.length === 0}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpiar Año
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar Cálculo del Décimo?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción eliminará todos los cálculos de Décimo Tercer Mes para el año <span className="font-bold">{currentYear}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                        className="bg-red-600 hover:bg-red-700" 
                        onClick={handleClearDecimo}
                    >
                        Confirmar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      
      {/* Tabla de Resultados (Mantenida) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Resultados del Décimo Tercer Mes ({currentYear})</CardTitle>
          <CardDescription>
            {calculatedDecimos.length} empleados listos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calculatedDecimos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No hay cálculos de décimo para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Meses Trab.</TableHead>
                    <TableHead>Salario Promedio</TableHead>
                    <TableHead>Monto Bruto</TableHead>
                    <TableHead>Deducciones (CSS+ISR)</TableHead>
                    <TableHead>Monto Neto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculatedDecimos.map((calc) => (
                    <TableRow key={calc.empleadoId}>
                      <TableCell className="font-medium">{calc.employeeName}</TableCell>
                      <TableCell>{calc.mesesTrabajados}</TableCell>
                      <TableCell>{formatCurrency(calc.salarioPromedio)}</TableCell>
                      <TableCell>{formatCurrency(calc.montoTotal)}</TableCell>
                      <TableCell>{formatCurrency(calc.totalDeducciones)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(calc.montoNeto)}</TableCell>
                      <TableCell>
                        <Badge variant={calc.estado === 'pagado_completo' ? "success" : "default"}>
                            {calc.estado.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="text-xl font-bold mb-3">Resumen del Pago Anual</h2>
        <Card>
            <CardContent className="pt-6 grid grid-cols-3 gap-6">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Pago Abril</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculatedDecimos.reduce((sum, c) => sum + c.pagoAbril, 0))}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Pago Agosto</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculatedDecimos.reduce((sum, c) => sum + c.pagoAgosto, 0))}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Pago Diciembre</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculatedDecimos.reduce((sum, c) => sum + c.pagoDiciembre, 0))}</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}