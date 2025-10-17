// File: app/pagos-sipe/page.tsx

"use client"

import { useState, useMemo, useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { SIPEPayment } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Save, Trash2, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
// FIX IMPORT: Usar Named Imports
import { MonthSelector } from "@/components/month-selector" 
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { es } from "date-fns/locale"


export default function PagosSIPEPage() {
  const {
    currentCompany,
    sipePayments,
    saveSIPEPayment,
    deleteSIPEPayment,
    currentPeriod,
    selectPeriod,
    calculateSIPEApi, // Nueva función de cálculo de API
    isLoading
  } = usePayroll()

  const [currentSIPE, setCurrentSIPE] = useState<SIPEPayment | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  
  const paymentForCurrentPeriod = useMemo(() => sipePayments.find(p => p.periodo === currentPeriod), [sipePayments, currentPeriod])


  // Sincronizar el estado local con la data de la DB al cambiar el período
  useEffect(() => {
    setCurrentSIPE(paymentForCurrentPeriod || null)
  }, [paymentForCurrentPeriod])

  const handleCalculateSIPE = async () => {
    if (!currentCompany) {
      toast({ title: "Advertencia", description: "Seleccione una compañía primero.", variant: "warning" })
      return
    }

    setIsCalculating(true)
    try {
      // FIX ASÍNCRONO: Usar await para la llamada a la API de cálculo
      const result = await calculateSIPEApi(currentPeriod) 
      
      setCurrentSIPE({
        ...result,
        companiaId: currentCompany.id,
        estado: 'pendiente',
        fechaPago: undefined,
        referenciaPago: undefined,
      })

      toast({ title: "Cálculo Completo", description: `Pago SIPE calculado para ${currentPeriod}.`, variant: "success" })

    } catch (e) {
      console.error("Error calculating SIPE:", e)
      toast({ title: "Error", description: "Fallo el cálculo del Pago SIPE. Verifique la consola.", variant: "destructive" })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleSaveSIPE = async () => {
    if (!currentSIPE || !currentCompany) return

    setIsSaving(true)
    try {
      // FIX ASÍNCRONO: Usar await para la persistencia
      await saveSIPEPayment(currentSIPE) 
      
      toast({ title: "Guardado Exitoso", description: `El pago SIPE de ${currentPeriod} ha sido guardado.`, variant: "success" })
    } catch (e) {
      console.error("Error saving SIPE:", e)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleUpdateStatus = async (fechaPago: Date) => {
    if (!paymentForCurrentPeriod) return
    setIsUpdatingStatus(true)
    
    const updatedData: Partial<SIPEPayment> = {
        estado: 'pagado',
        fechaPago: format(fechaPago, 'yyyy-MM-dd')
    }
    
    try {
        // FIX ASÍNCRONO: Usar await para la actualización (asumo que se implementó un PATCH)
        // Ya que la lógica de saveSIPEPayment usa UPSERT, podemos usarla también para actualizar.
        await saveSIPEPayment({
            ...paymentForCurrentPeriod,
            ...updatedData
        })
        
        toast({ title: "Estado Actualizado", description: "El pago se ha marcado como PAGADO.", variant: "success" })
    } catch (e) {
        console.error("Error updating SIPE status:", e)
    } finally {
        setIsUpdatingStatus(false)
    }
  }


  if (!currentCompany) {
    return <div className="p-8"><div className="text-center py-20 text-muted-foreground">Por favor, seleccione una compañía para gestionar los Pagos SIPE.</div></div>
  }
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Gestión de Pagos SIPE</h1>
      
      {/* Control de Período y Cálculo */}
      <Card className="mb-6">
        <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Período de Pago (Mes)</label>
                <MonthSelector 
                    selectedMonth={currentPeriod} 
                    onMonthChange={selectPeriod} 
                />
            </div>
            
            <Button 
                onClick={handleCalculateSIPE} 
                disabled={isCalculating || !!paymentForCurrentPeriod}
                className="ml-auto min-w-[150px]"
            >
                {isCalculating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Check className="mr-2 h-4 w-4" />
                )}
                {isCalculating ? "Calculando..." : "Calcular Totales"}
            </Button>
            
        </CardContent>
      </Card>
      
      {/* Resumen del Pago */}
      {(currentSIPE || paymentForCurrentPeriod) && (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Totales para el Período: {currentPeriod}</CardTitle>
                <CardDescription>
                    {paymentForCurrentPeriod ? (
                        <div className="flex items-center space-x-2">
                             Estado: <Badge variant={paymentForCurrentPeriod.estado === 'pagado' ? "success" : "default"}>{paymentForCurrentPeriod.estado.toUpperCase()}</Badge>
                             {paymentForCurrentPeriod.fechaLimite && (
                                <span className="text-sm text-muted-foreground ml-4">
                                    Fecha Límite: {format(new Date(paymentForCurrentPeriod.fechaLimite), 'PPP', { locale: es })}
                                </span>
                             )}
                        </div>
                    ) : (
                        "Totales calculados, pero no guardados."
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Total a Pagar (Patrono + Empleado)</TableCell>
                            <TableCell className="text-right text-xl font-bold text-primary">
                                {formatCurrency((currentSIPE || paymentForCurrentPeriod)?.totalAPagar || 0)}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Total Seguro Social (Empleado)</TableCell>
                            <TableCell className="text-right">{formatCurrency((currentSIPE || paymentForCurrentPeriod)?.totalSeguroSocialEmpleado || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Total Seguro Social (Patrono)</TableCell>
                            <TableCell className="text-right">{formatCurrency((currentSIPE || paymentForCurrentPeriod)?.totalSeguroSocialEmpleador || 0)}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell>Total Seguro Educativo (Empleado)</TableCell>
                            <TableCell className="text-right">{formatCurrency((currentSIPE || paymentForCurrentPeriod)?.totalSeguroEducativoEmpleado || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Total Seguro Educativo (Patrono)</TableCell>
                            <TableCell className="text-right">{formatCurrency((currentSIPE || paymentForCurrentPeriod)?.totalSeguroEducativoEmpleador || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Total Riesgo Profesional (Patrono)</TableCell>
                            <TableCell className="text-right">{formatCurrency((currentSIPE || paymentForCurrentPeriod)?.totalRiesgoProfesional || 0)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <div className="flex justify-end space-x-4 mt-6">
                    {paymentForCurrentPeriod?.estado !== 'pagado' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    disabled={!paymentForCurrentPeriod || isUpdatingStatus}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {isUpdatingStatus ? "Marcando..." : "Marcar como Pagado"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    locale={es}
                                    onSelect={(date) => {
                                        if (date) {
                                            handleUpdateStatus(date)
                                        }
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                    
                    <Button 
                        onClick={handleSaveSIPE}
                        disabled={isSaving || paymentForCurrentPeriod?.estado === 'pagado'}
                        variant={paymentForCurrentPeriod ? "default" : "secondary"}
                    >
                        {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        {paymentForCurrentPeriod ? "Actualizar Pago" : "Guardar Pago"}
                    </Button>
                    
                    {paymentForCurrentPeriod && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar Pago SIPE?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción eliminará el registro de pago SIPE para el período {currentPeriod}.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                        className="bg-red-600 hover:bg-red-700" 
                                        onClick={() => paymentForCurrentPeriod.id && deleteSIPEPayment(paymentForCurrentPeriod.id)}
                                    >
                                        Confirmar Eliminación
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </CardContent>
        </Card>
      )}
      
      {/* Historial de Pagos (Mantenido) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de Pagos SIPE</CardTitle>
          <CardDescription>
            Registros de pagos enviados a la Caja de Seguro Social.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sipePayments.map((payment) => (
                    <TableRow key={payment.periodo}>
                      <TableCell className="font-medium">{payment.periodo}</TableCell>
                      <TableCell>{format(new Date(payment.fechaLimite), 'PPP', { locale: es })}</TableCell>
                      <TableCell>{formatCurrency(payment.totalAPagar)}</TableCell>
                      <TableCell>
                          <Badge variant={payment.estado === 'pagado' ? "success" : "default"}>
                              {payment.estado.toUpperCase()}
                          </Badge>
                      </TableCell>
                      <TableCell>
                          {payment.fechaPago ? format(new Date(payment.fechaPago), 'PPP', { locale: es }) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}