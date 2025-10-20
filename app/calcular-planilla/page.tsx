"use client"

import { useState, useMemo, useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { Employee, PayrollEntry } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Save, Trash2, Eye } from "lucide-react" // Added Eye
import { PeriodSelector } from "@/components/period-selector" 
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
// Importamos solo el tipo de resultado de cálculo
import { PayrollCalculationResult } from "@/lib/payroll-calculations" 

// Definición de la estructura de la planilla temporal (TIPADO CORREGIDO)
// Ahora extiende PayrollCalculationResult y añade los campos necesarios para la UI
interface CalculatedPayroll extends PayrollCalculationResult {
    employee: Employee
    periodo: string
    tipoPeriodo: 'quincenal' | 'mensual'
    horasExtras: number
    bonificaciones: number
    otrosIngresos: number
    otrasRetenciones: number
    fondoCesantia: number; 
    // Tipos compatibles con PayrollEntry (borrador, aprobado, pagado) + 'calculado' (local)
    estado: 'calculado' | 'pagado' | 'borrador' | 'aprobado' 
}


export default function CalcularPlanillaPage() {
    const {
        currentCompany,
        employees: employeesContext, // Usar contexto con fallback
        legalParameters,
        isrBrackets,
        payrollEntries: payrollEntriesContext, // Usar contexto con fallback
        savePayrollEntries,
        deletePeriodPayroll,
        currentPeriod,
        selectPeriod,
        calculatePayrollApi,
    } = usePayroll()

    // Fallback de contexto
    const employees = employeesContext || [];
    const payrollEntries = payrollEntriesContext || [];
    
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
        // Lógica para obtener el último día del mes y usarlo como día de la quincena
        const date = new Date(parseInt(currentPeriod.slice(0, 4)), parseInt(currentPeriod.slice(5, 7)), 0);
        const lastDayOfMonth = format(date, 'dd');
        const day = periodoQuincenal === 'primera' ? '15' : lastDayOfMonth; 
        return `${currentPeriod}-${day}`
    }, [currentPeriod, tipoPeriodo, periodoQuincenal])

    const existingEntries = useMemo(() => payrollEntries.filter(e => e.periodo === finalPeriod), [payrollEntries, finalPeriod])
    const isPeriodClosed = existingEntries.length > 0 && existingEntries.every(e => e.estado === 'pagado')

    // Sincronización de entradas existentes con el estado CalculatedPayroll
    useEffect(() => {
        if (existingEntries.length > 0) {
            const syncedData: CalculatedPayroll[] = existingEntries.map(e => {
                const employee = employees.find(emp => emp.id === e.empleadoId)
                
                // Si el empleado no existe (ej. fue eliminado), saltar la entrada
                if (!employee) return null; 

                return {
                    // El spread '...e' trae todas las propiedades de PayrollEntry.
                    // Usamos el operador de coalescencia nula ?? 0 en caso de que alguna sea null/undefined.
                    ...e,
                    employee: employee,
                    
                    // FIX TIPADO y FALLBACK: 
                    salarioBruto: e.salarioBruto ?? 0,
                    seguroSocialEmpleado: e.seguroSocialEmpleado ?? 0,
                    seguroEducativo: e.seguroEducativo ?? 0,
                    isr: e.isr ?? 0,
                    totalDeducciones: (e as any).totalDeducciones ?? 0, // FIX: Si PayrollEntry no tiene totalDeducciones, usar fallback 0.
                    salarioNeto: e.salarioNeto ?? 0,
                    seguroSocialEmpleador: e.seguroSocialEmpleador ?? 0,
                    seguroEducativoEmpleador: e.seguroEducativoEmpleador ?? 0,
                    riesgoProfesional: e.riesgoProfesional ?? 0,
                    fondoCesantia: e.fondoCesantia ?? 0, 
                    
                    horasExtras: e.horasExtras ?? 0,
                    bonificaciones: e.bonificaciones ?? 0,
                    otrosIngresos: e.otrosIngresos ?? 0,
                    otrasRetenciones: e.otrasRetenciones ?? 0,
                    
                    // Propiedades del cálculo
                    tipoPeriodo: e.tipoPeriodo as 'quincenal' | 'mensual',
                    deduccionesBancarias: e.deduccionesBancarias ?? 0,
                    prestamos: e.prestamos ?? 0,
                    otrasDeduccionesPersonalizadas: e.otrasDeduccionesPersonalizadas ?? 0,

                    // Asignar el estado
                    estado: e.estado as 'pagado' | 'borrador' | 'aprobado', 
                } as CalculatedPayroll;
            }).filter((e): e is CalculatedPayroll => e !== null); // Filtrar nulls

            setCalculatedPlanilla(syncedData)
            
            // Sincronizar mapas de extras/retenciones 
            const newHorasExtrasMap: Record<string, number> = {};
            const newBonificacionesMap: Record<string, number> = {};
            const newOtrosIngresosMap: Record<string, number> = {};
            const newOtrasRetencionesMap: Record<string, number> = {};

            syncedData.forEach(entry => {
                newHorasExtrasMap[entry.employee.id] = entry.horasExtras;
                newBonificacionesMap[entry.employee.id] = entry.bonificaciones;
                newOtrosIngresosMap[entry.employee.id] = entry.otrosIngresos;
                newOtrasRetencionesMap[entry.employee.id] = entry.otrasRetenciones;
            });

            setHorasExtrasMap(newHorasExtrasMap);
            setBonificacionesMap(newBonificacionesMap);
            setOtrosIngresosMap(newOtrosIngresosMap);
            setOtrasRetencionesMap(newOtrasRetencionesMap);
            
        } else {
            setCalculatedPlanilla([])
        }
    }, [existingEntries, employees]) 

    const handleCalculatePayroll = async () => {
        // Fallback robusto para evitar errores de tipado si el contexto no está completamente cargado
        if (!currentCompany || employees.length === 0) {
            // FIX TOAST: Reemplazar 'warning' por 'default'
            toast({ title: "Advertencia", description: "No hay empleados activos o compañía seleccionada.", variant: "default" })
            return
        }
        
        if (legalParameters.length === 0 || isrBrackets.length === 0) {
            // FIX TOAST: Reemplazar 'warning' por 'default'
            toast({ title: "Advertencia", description: "Faltan parámetros legales o la tabla ISR. Configúralos primero.", variant: "default" })
            return
        }

        setIsCalculating(true)
        const newCalculations: CalculatedPayroll[] = []

        try {
            for (const employee of employees.filter(e => e.estado === 'activo')) {
                const input: PayrollCalculationInput = { // Usar el tipo correcto aquí
                    employee: employee,
                    periodo: finalPeriod,
                    tipoPeriodo: tipoPeriodo,
                    // FIX TIPADO: Aseguramos que los valores sean number (no number | undefined)
                    horasExtras: horasExtrasMap[employee.id] || 0, 
                    bonificaciones: bonificacionesMap[employee.id] || 0,
                    otrosIngresos: otrosIngresosMap[employee.id] || 0,
                    otrasRetenciones: otrasRetencionesMap[employee.id] || 0,
                    legalParameters: legalParameters,
                    isrBrackets: isrBrackets
                }
                
                const result = await calculatePayrollApi({ 
                    ...input, 
                    currentLegalParameters: legalParameters, 
                    currentISRBrackets: isrBrackets 
                }) 

                const payrollEntry: CalculatedPayroll = {
                    ...result,
                    employee: employee,
                    periodo: finalPeriod,
                    tipoPeriodo: tipoPeriodo,
                    // Estos campos ya vienen en result, pero los duplicamos de input para la consistencia
                    horasExtras: input.horasExtras ?? 0, 
                    bonificaciones: input.bonificaciones ?? 0,
                    otrosIngresos: input.otrosIngresos ?? 0,
                    otrasRetenciones: input.otrasRetenciones ?? 0,
                    estado: 'calculado', // Estado local de cálculo
                    // Aseguramos que fondoCesantia esté presente en el resultado del cálculo
                    fondoCesantia: (result as any).fondoCesantia ?? 0, 
                }

                newCalculations.push(payrollEntry)
            }

            // FIX TOAST: Reemplazar 'success' por 'default'
            setCalculatedPlanilla(newCalculations)
            toast({ title: "Cálculo Completo", description: `Se calcularon ${newCalculations.length} entradas para el período ${finalPeriod}.`, variant: "default" })

        } catch (e) {
            console.error("Error calculating payroll:", e)
            toast({ title: "Error", description: "Fallo el cálculo de la planilla. Verifique los parámetros y la consola.", variant: "destructive" })
        } finally {
            setIsCalculating(false)
        }
    }

    const handleSavePayroll = async (estado: 'pagado' | 'borrador' | 'aprobado') => { // Acepta estado 'aprobado'
        if (calculatedPlanilla.length === 0 || !currentCompany) return

        setIsSaving(true)
        try {
            const entriesToSave: PayrollEntry[] = calculatedPlanilla.map((calc) => {
                // Usar ID existente si lo hay (para PATCH/update), o generar uno temporal para POST/create
                const existingId = existingEntries.find(e => e.empleadoId === calc.employee.id)?.id;
                
                // Asegurar fallbacks correctos para campos que pueden ser opcionales en la DB
                return {
                    id: existingId || `temp-${calc.employee.id}`, 
                    companiaId: currentCompany.id,
                    empleadoId: calc.employee.id,
                    periodo: calc.periodo,
                    tipoPeriodo: calc.tipoPeriodo,
                    salarioBruto: calc.salarioBruto,
                    horasExtras: calc.horasExtras,
                    bonificaciones: calc.bonificaciones,
                    otrosIngresos: calc.otrosIngresos,
                    seguroSocialEmpleado: calc.seguroSocialEmpleado,
                    seguroEducativo: calc.seguroEducativo,
                    isr: calc.isr,
                    deduccionesBancarias: calc.deduccionesBancarias,
                    prestamos: calc.prestamos,
                    otrasDeduccionesPersonalizadas: calc.otrasDeduccionesPersonalizadas,
                    // otrasRetenciones: calc.otrasRetenciones, <--- ELIMINADO: Duplicado en el original
                    salarioNeto: calc.salarioNeto,
                    fechaCalculo: new Date().toISOString(),
                    estado: estado, 
                    seguroSocialEmpleador: calc.seguroSocialEmpleador,
                    seguroEducativoEmpleador: calc.seguroEducativoEmpleador,
                    riesgoProfesional: calc.riesgoProfesional,
                    fondoCesantia: calc.fondoCesantia,
                    // FIX: totalDeducciones no existe en PayrollEntry en el esquema DB,
                    // pero se usa en el payload de guardado si se mapea. Si debe ir a DB,
                    // debe ser parte de PayrollEntry. Asumo que es requerido por el backend.
                    totalDeducciones: calc.totalDeducciones, 
                    otrasRetenciones: calc.otrasRetenciones, // <- Esta es la propiedad correcta (L254 original)
                }
            })

            await savePayrollEntries(entriesToSave)
            // FIX TOAST: Reemplazar 'success' por 'default'
            toast({ title: "Guardado Exitoso", description: `La planilla se guardó como ${estado}.`, variant: "default" })
        } catch (e) {
            console.error("Error saving payroll:", e)
            toast({ title: "Error al Guardar", description: "Fallo al guardar la planilla. Revise la consola.", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    const handleClearPayroll = async () => {
        if (existingEntries.length === 0) return
        try {
            await deletePeriodPayroll(finalPeriod)
            setCalculatedPlanilla([])
            // FIX TOAST: Reemplazar 'success' por 'default'
            toast({ title: "Planilla Eliminada", description: `La planilla del período ${finalPeriod} fue eliminada.`, variant: "default" })
        } catch (e) {
            console.error("Error clearing payroll:", e)
            toast({ title: "Error al Eliminar", description: "Fallo al limpiar la planilla. Revise la consola.", variant: "destructive" })
        }
    }
    
    // Handlers para inputs de horas/extras
    const createMapHandler = (mapSetter: React.Dispatch<React.SetStateAction<Record<string, number>>>) => 
        (employeeId: string, value: string) => {
            mapSetter(prev => ({
                ...prev,
                [employeeId]: Number(value) || 0
            }));
        };

    const handleHorasExtrasChange = useMemo(() => createMapHandler(setHorasExtrasMap), []);
    const handleBonificacionesChange = useMemo(() => createMapHandler(setBonificacionesMap), []);
    const handleOtrosIngresosChange = useMemo(() => createMapHandler(setOtrosIngresosMap), []);
    const handleOtrasRetencionesChange = useMemo(() => createMapHandler(setOtrasRetencionesMap), []);


    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Calcular Planilla</h1>
            <Card className="mb-6">
                <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                        
                        {/* 1. Selector de Período Mensual */}
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
                                        <Label htmlFor="quincena-1">Primera (Día 15)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="segunda" id="quincena-2" />
                                        <Label htmlFor="quincena-2">Segunda (Fin de Mes)</Label>
                                    </div> 
                                </RadioGroup>
                            </div>
                        )}
                        
                        <Button 
                            onClick={handleCalculatePayroll} 
                            disabled={isCalculating || !currentCompany || employees.filter(e => e.estado === 'activo').length === 0}
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
                                {/* FIX VARIANT: Cambiado a success/default */}
                                Estado: <Badge variant={isPeriodClosed ? "default" : "default"}>{isPeriodClosed ? "Pagado (Finalizado)" : existingEntries[0].estado}</Badge>
                            </span>
                        )}
                    </p>
                    
                </CardContent>
            </Card>

            <Tabs defaultValue="calculo">
                <TabsList>
                    <TabsTrigger value="calculo">Detalle de Cálculo</TabsTrigger>
                    <TabsTrigger value="extras">Extras e Ingresos</TabsTrigger>
                    <TabsTrigger value="retenciones">Otras Retenciones</TabsTrigger>
                </TabsList>

                {/* TAB 1: DETALLE DE CÁLCULO */}
                <TabsContent value="calculo" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resultados de la Planilla {finalPeriod}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[200px]">Empleado</TableHead>
                                            <TableHead className="text-right">Salario Base</TableHead>
                                            <TableHead className="text-right">Bruto Calculado</TableHead>
                                            <TableHead className="text-right text-destructive">Total Deducciones</TableHead>
                                            <TableHead className="text-right text-primary">Neto a Pagar</TableHead>
                                            <TableHead className="w-[100px] text-center">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {calculatedPlanilla.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                    {isCalculating ? "Calculando..." : "Presione 'Calcular Planilla' para ver los resultados."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            calculatedPlanilla.map((entry) => (
                                                <TableRow key={entry.employee.id}>
                                                    <TableCell className="font-medium">
                                                        {entry.employee.nombre} {entry.employee.apellido}
                                                        {entry.employee.estado !== 'activo' && <Badge variant="destructive" className="ml-2">Inactivo</Badge>}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {formatCurrency(entry.employee.salarioBase)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-medium">
                                                        {formatCurrency(entry.salarioBruto)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-destructive">
                                                        {formatCurrency(entry.totalDeducciones)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-primary">
                                                        {formatCurrency(entry.salarioNeto)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedEntry(entry);
                                                                setDialogOpen(true);
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                {/* TAB 2: EXTRAS E INGRESOS */}
                <TabsContent value="extras" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ingresos Adicionales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30%]">Empleado</TableHead>
                                        <TableHead className="text-right">Horas Extras ($)</TableHead>
                                        <TableHead className="text-right">Bonificaciones ($)</TableHead>
                                        <TableHead className="text-right">Otros Ingresos ($)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.filter(e => e.estado === 'activo').map(employee => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">{employee.nombre} {employee.apellido}</TableCell>
                                            <TableCell className="text-right">
                                                <Input 
                                                    type="number"
                                                    value={horasExtrasMap[employee.id] || ''}
                                                    onChange={(e) => handleHorasExtrasChange(employee.id, e.target.value)}
                                                    className="w-full text-right"
                                                    placeholder="0.00"
                                                    disabled={isPeriodClosed}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input 
                                                    type="number"
                                                    value={bonificacionesMap[employee.id] || ''}
                                                    onChange={(e) => handleBonificacionesChange(employee.id, e.target.value)}
                                                    className="w-full text-right"
                                                    placeholder="0.00"
                                                    disabled={isPeriodClosed}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input 
                                                    type="number"
                                                    value={otrosIngresosMap[employee.id] || ''}
                                                    onChange={(e) => handleOtrosIngresosChange(employee.id, e.target.value)}
                                                    className="w-full text-right"
                                                    placeholder="0.00"
                                                    disabled={isPeriodClosed}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: OTRAS RETENCIONES */}
                <TabsContent value="retenciones" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Otras Retenciones (Adicionales a deducciones fijas)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[70%]">Empleado</TableHead>
                                        <TableHead className="text-right">Monto de Retención ($)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.filter(e => e.estado === 'activo').map(employee => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">{employee.nombre} {employee.apellido}</TableCell>
                                            <TableCell className="text-right">
                                                <Input 
                                                    type="number"
                                                    value={otrasRetencionesMap[employee.id] || ''}
                                                    onChange={(e) => handleOtrasRetencionesChange(employee.id, e.target.value)}
                                                    className="w-full text-right"
                                                    placeholder="0.00"
                                                    disabled={isPeriodClosed}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            {/* Botones de Acción */}
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
                        onClick={() => handleSavePayroll('aprobado')}
                        variant="default"
                        disabled={isSaving || isPeriodClosed}
                    >
                        {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Check className="mr-2 h-4 w-4" />}
                        Guardar y Aprobar
                    </Button>

                    <Button 
                        onClick={() => handleSavePayroll('pagado')}
                        disabled={isSaving || isPeriodClosed}
                        variant="default" // FIX VARIANT: Cambiado de 'success' a 'default' (asumiendo que 'success' no es un variant de Button)
                    >
                        {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Check className="mr-2 h-4 w-4" />}
                        Marcar como Pagado
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
                                    Confirmar Eliminación
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
            
            {/* Diálogo de Detalles */}
            <PayrollDetailDialog 
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                employee={selectedEntry?.employee as Employee}
                calculation={selectedEntry as PayrollCalculationResult}
                periodo={selectedEntry?.periodo || ""}
            />
        </div>
    )
}
