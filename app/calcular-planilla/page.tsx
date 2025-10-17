// File: app/calcular-planilla/page.tsx (CORREGIDO FINAL)

"use client"

import { useState, useMemo, useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { Employee, PayrollEntry, } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Save, Trash2, X } from "lucide-react"
// FIX IMPORT: Usar PeriodSelector para el selector de período único
import { PeriodSelector } from "@/components/period-selector" 
// FIX IMPORT: Asegurarse de que PayrollDetailDialog sea Named Export
import { PayrollDetailDialog } from "@/components/payroll-detail-dialog"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { PayrollCalculationInput } from "@/lib/server-calculations"
import { PayrollCalculationResult } from "@/lib/payroll-calculations"

// Definición de la estructura de la planilla temporal (TIPADO CORREGIDO)
interface CalculatedPayroll extends PayrollCalculationResult {
  employee: Employee
  periodo: string
  tipoPeriodo: 'quincenal' | 'mensual'
  horasExtras: number
  bonificaciones: number
  otrosIngresos: number
  otrasRetenciones: number
  // Tipos compatibles con PayrollEntry (borrador, aprobado, pagado) + 'calculado' (local)
  estado: 'calculado' | 'pagado' | 'borrador' | 'aprobado' 
}

export default function CalcularPlanillaPage() {
  const {
    currentCompany,
    employees,
    legalParameters,
    isrBrackets,
    payrollEntries,
    savePayrollEntries,
    deletePeriodPayroll,
    currentPeriod,
    selectPeriod,
    calculatePayrollApi,
  } = usePayroll()

  const [calculatedPlanilla, setCalculatedPlanilla] = useState<CalculatedPayroll[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<CalculatedPayroll | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tipoPeriodo, setTipoPeriodo] = useState<'quincenal' | 'mensual'>('quincenal')
  const [periodoQuincenal, setPeriodoQuincenal] = useState<'primera' | 'segunda'>('primera')
  const [horasExtrasMap, setHorasExtrasMap] = useState<Record<string, number>>({})
  const [bonificacionesMap, setBonificacionesMap] = useState<Record<string, number>>({})
  const [otrosIngresosMap, setOtrosIngresosMap] = useState<Record<string, number>>({})
  const [otrasRetencionesMap, setOtrasRetencionesMap] = useState<Record<string, number>>({})

  const finalPeriod = useMemo(() => {
    if (tipoPeriodo === 'mensual') return currentPeriod
    const day = periodoQuincenal === 'primera' ? '15' : format(new Date(parseInt(currentPeriod.slice(0, 4)), parseInt(currentPeriod.slice(5, 7)), 0), 'dd'); 
    return `${currentPeriod}-${day}`
  }, [currentPeriod, tipoPeriodo, periodoQuincenal])

  const existingEntries = useMemo(() => payrollEntries.filter(e => e.periodo === finalPeriod), [payrollEntries, finalPeriod])
  const isPeriodClosed = existingEntries.length > 0 && existingEntries.every(e => e.estado === 'pagado')

  useEffect(() => {
    if (existingEntries.length > 0) {
      const syncedData: CalculatedPayroll[] = existingEntries.map(e => ({
        ...e,
        employee: employees.find(emp => emp.id === e.empleadoId) as Employee,
        horasExtras: e.horasExtras || 0,
        bonificaciones: e.bonificaciones || 0,
        otrosIngresos: e.otrosIngresos || 0,
        otrasRetenciones: e.otrasRetenciones || 0,
      })).filter(e => e.employee) 
      setCalculatedPlanilla(syncedData)
    } else {
      setCalculatedPlanilla([])
    }
  }, [existingEntries, employees]) 

  const handleCalculatePayroll = async () => {
    if (!currentCompany || employees.length === 0) {
      toast({ title: "Advertencia", description: "No hay empleados o compañía seleccionada.", variant: "warning" })
      return
    }
    
    if (legalParameters.length === 0 || isrBrackets.length === 0) {
        toast({ title: "Advertencia", description: "Faltan parámetros legales o la tabla ISR. Configúralos primero.", variant: "warning" })
        return
    }

    setIsCalculating(true)
    const newCalculations: CalculatedPayroll[] = []

    try {
      for (const employee of employees.filter(e => e.estado === 'activo')) {
        const input: Omit<PayrollCalculationInput, 'legalParameters' | 'isrBrackets'> & { currentLegalParameters: any, currentISRBrackets: any } = {
          employee: employee,
          periodo: finalPeriod,
          tipoPeriodo: tipoPeriodo,
          horasExtras: horasExtrasMap[employee.id] || 0,
          bonificaciones: bonificacionesMap[employee.id] || 0,
          otrosIngresos: otrosIngresosMap[employee.id] || 0,
          otrasRetenciones: otrasRetencionesMap[employee.id] || 0,
          currentLegalParameters: legalParameters,
          currentISRBrackets: isrBrackets
        }
        
        const result = await calculatePayrollApi(input) 

        const payrollEntry: CalculatedPayroll = {
          ...result,
          employee: employee,
          periodo: finalPeriod,
          tipoPeriodo: tipoPeriodo,
          horasExtras: input.horasExtras,
          bonificaciones: input.bonificaciones,
          otrosIngresos: input.otrosIngresos,
          otrasRetenciones: input.otrasRetenciones,
          estado: 'calculado', // Estado local de cálculo
        }
        newCalculations.push(payrollEntry)
      }

      setCalculatedPlanilla(newCalculations)
      toast({ title: "Cálculo Completo", description: `Se calcularon ${newCalculations.length} entradas para el período ${finalPeriod}.`, variant: "success" })

    } catch (e) {
      console.error("Error calculating payroll:", e)
      toast({ title: "Error", description: "Fallo el cálculo de la planilla. Verifique los parámetros y la consola.", variant: "destructive" })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleSavePayroll = async (estado: 'pagado' | 'borrador') => {
    if (calculatedPlanilla.length === 0 || !currentCompany) return

    setIsSaving(true)
    try {
      const entriesToSave: PayrollEntry[] = calculatedPlanilla.map((calc) => ({
        id: existingEntries.find(e => e.empleadoId === calc.employee.id)?.id || `temp-${calc.employee.id}`, 
        companiaId: currentCompany.id,
        empleadoId: calc.employee.id,
        periodo: calc.periodo,
        tipoPeriodo: calc.tipoPeriodo,
        salarioBruto: calc?.salarioBruto,
        horasExtras: calc.horasExtras,
        bonificaciones: calc.bonificaciones,
        otrosIngresos: calc.otrosIngresos,
        seguroSocialEmpleado: calc?.seguroSocialEmpleado,
        seguroEducativo: calc?.seguroEducativo,
        isr: calc?.isr,
        deduccionesBancarias: calc.deduccionesBancarias,
        prestamos: calc.prestamos,
        otrasDeduccionesPersonalizadas: calc.otrasDeduccionesPersonalizadas,
        otrasRetenciones: calc.otrasRetenciones,
        salarioNeto: calc.salarioNeto,
        fechaCalculo: new Date().toISOString(),
        estado: estado, 
        seguroSocialEmpleador: calc.seguroSocialEmpleador,
        seguroEducativoEmpleador: calc.seguroEducativoEmpleador,
        riesgoProfesional: calc.riesgoProfesional,
        fondoCesantia: calc.fondoCesantia,
      }))

      await savePayrollEntries(entriesToSave)
      toast({ title: "Guardado Exitoso", description: `La planilla se guardó como ${estado}.`, variant: "success" })
    } catch (e) {
      console.error("Error saving payroll:", e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearPayroll = async () => {
    if (existingEntries.length === 0) return
    try {
      await deletePeriodPayroll(finalPeriod)
      setCalculatedPlanilla([])
    } catch (e) {
      console.error("Error clearing payroll:", e)
    }
  }
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Calcular Planilla</h1>
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            
            {/* 1. Selector de Período Mensual (CORREGIDO) */}
            <div className="flex flex-col space-y-1">
                <Label htmlFor="period-selector">Período Mensual</Label>
                <PeriodSelector 
                    selectedPeriod={currentPeriod} 
                    onPeriodChange={selectPeriod} 
                    mode="month"
                />
            </div>
            
            <div className="flex flex-col space-y-1">
                <Label>Frecuencia de Pago</Label>
                <RadioGroup 
                    defaultValue="quincenal" 
                    value={tipoPeriodo}
                    onValueChange={(value: 'quincenal' | 'mensual') => {
                        setTipoPeriodo(value)
                        setPeriodoQuincenal('primera')
                    }}
                    className="flex space-x-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quincenal" id="quincenal" />
                        <Label htmlFor="quincenal">Quincenal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mensual" id="mensual" />
                        <Label htmlFor="mensual">Mensual</Label>
                    </div>
                </RadioGroup>
            </div>
            
            {tipoPeriodo === 'quincenal' && (
                <div className="flex flex-col space-y-1">
                    <Label>Quincena</Label>
                    <RadioGroup 
                        defaultValue="primera" 
                        value={periodoQuincenal}
                        onValueChange={(value: 'primera' | 'segunda') => setPeriodoQuincenal(value)}
                        className="flex space-x-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="primera" id="quincena-1" />
                            <Label htmlFor="quincena-1">Primera</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="segunda" id="quincena-2" />
                            <Label htmlFor="quincena-2">Segunda</Label>
                        </div> 
                        {/* Se eliminó el </Button> extra que causaba el error de sintaxis */}
                    </RadioGroup>
                </div>
            )}
            
            <Button 
                onClick={handleCalculatePayroll} 
                disabled={isCalculating || !currentCompany || employees.length === 0}
                className="ml-auto min-w-[150px]"
            >
                {isCalculating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Check className="mr-2 h-4 w-4" />
                )}
                {isCalculating ? "Calculando..." : "Calcular Planilla"}
            </Button>
            
          </div>

          <p className="text-sm text-muted-foreground pt-2">
            Período de cálculo: <Badge variant="secondary" className="font-mono">{finalPeriod}</Badge>
            {existingEntries.length > 0 && (
                <span className="ml-4">
                    Estado: <Badge variant={isPeriodClosed ? "success" : "default"}>{isPeriodClosed ? "Pagado (Finalizado)" : "Borrador (Existente)"}</Badge>
                </span>
            )}
          </p>
          
        </CardContent>
      </Card>

      {/* ... (Tabs y Tabla de Resultados) ... */}
      
      {calculatedPlanilla.length > 0 && (
        <div className="flex justify-end space-x-4 mt-6">
          
          <Button 
            onClick={() => handleSavePayroll('borrador')}
            variant="outline"
            disabled={isSaving || isPeriodClosed}
          >
            {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Borrador
          </Button>
          
          <Button 
            onClick={() => handleSavePayroll('pagado')}
            variant="default"
            disabled={isSaving || isPeriodClosed}
          >
            {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Check className="mr-2 h-4 w-4" />}
            Guardar y Pagar Planilla
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button 
                    variant="destructive" 
                    disabled={isSaving || existingEntries.length === 0}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpiar Periodo
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar Planilla del Período?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción eliminará todas las entradas de planilla para el período <span className="font-bold">{finalPeriod}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                        className="bg-red-600 hover:bg-red-700" 
                        onClick={handleClearPayroll}
                    >
                        Confirmar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      
      <PayrollDetailDialog 
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        entry={selectedEntry}
      />
    </div>
  )
}