"use client"

import { useState } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calculator, Save, Eye, PieChart, Calendar } from "lucide-react"
import { calculatePayroll } from "@/lib/payroll-calculations"
import type { Employee } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { PayrollDetailDialog } from "@/components/payroll-detail-dialog"
import { DeductionsBreakdown } from "@/components/deductions-breakdown"

export default function CalcularPlanillaPage() {
  const { employees, legalParameters, isrBrackets, payrollEntries, addPayrollEntry, updatePayrollEntry } = usePayroll()
  const { toast } = useToast()

  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.toISOString().slice(0, 7))
  const [selectedQuincena, setSelectedQuincena] = useState<"1" | "2">("1")
  const [tipoPeriodo, setTipoPeriodo] = useState<"quincenal" | "mensual">("quincenal")

  const [calculatedPayroll, setCalculatedPayroll] = useState<
    Array<{
      employee: Employee
      calculation: ReturnType<typeof calculatePayroll>
      extras: { horasExtras: number; bonificaciones: number; otrosIngresos: number }
    }>
  >([])
  const [employeeExtras, setEmployeeExtras] = useState<
    Record<string, { horasExtras: number; bonificaciones: number; otrosIngresos: number }>
  >({})
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deductionsDialogOpen, setDeductionsDialogOpen] = useState(false)
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<{
    employee: Employee
    calculation: ReturnType<typeof calculatePayroll>
  } | null>(null)

  const getDateRange = () => {
    const [year, month] = selectedMonth.split("-")
    const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString("es-PA", { month: "long" })
    const lastDay = new Date(Number(year), Number(month), 0).getDate()

    if (tipoPeriodo === "mensual") {
      return `1 - ${lastDay} de ${monthName} ${year}`
    }

    if (selectedQuincena === "1") {
      return `1 - 15 de ${monthName} ${year}`
    } else {
      return `16 - ${lastDay} de ${monthName} ${year}`
    }
  }

  const getPeriodString = () => {
    if (tipoPeriodo === "mensual") {
      return selectedMonth
    }
    return `${selectedMonth}-${selectedQuincena}`
  }

  const activeEmployees = employees.filter((e) => e.estado === "activo")
  const currentPeriod = getPeriodString()
  const periodPayroll = payrollEntries.filter((e) => e.periodo === currentPeriod)

  const handleCalculate = () => {
    const results = activeEmployees.map((employee) => {
      const extras = employeeExtras[employee.id] || {
        horasExtras: 0,
        bonificaciones: 0,
        otrosIngresos: 0,
      }

      const calculation = calculatePayroll({
        employee,
        periodo: currentPeriod,
        tipoPeriodo,
        horasExtras: extras.horasExtras,
        bonificaciones: extras.bonificaciones,
        otrosIngresos: extras.otrosIngresos,
        legalParameters,
        isrBrackets,
      })

      return { employee, calculation, extras }
    })

    setCalculatedPayroll(results)
    toast({
      title: "Planilla calculada",
      description: `Se ha calculado la planilla ${tipoPeriodo} para ${results.length} empleados`,
    })
  }

  const handleSavePayroll = () => {
    if (calculatedPayroll.length === 0) {
      toast({
        title: "Error",
        description: "Primero debe calcular la planilla",
        variant: "destructive",
      })
      return
    }

    calculatedPayroll.forEach(({ employee, calculation, extras }) => {
      const existingEntry = periodPayroll.find((e) => e.empleadoId === employee.id)

      const payrollData = {
        empleadoId: employee.id,
        periodo: currentPeriod,
        tipoPeriodo,
        salarioBruto: calculation.salarioBruto,
        horasExtras: extras.horasExtras,
        bonificaciones: extras.bonificaciones,
        otrosIngresos: extras.otrosIngresos,
        seguroSocialEmpleado: calculation.seguroSocialEmpleado,
        seguroEducativo: calculation.seguroEducativo,
        isr: calculation.isr,
        deduccionesBancarias: calculation.deduccionesBancarias,
        prestamos: calculation.prestamos,
        otrasDeduccionesPersonalizadas: calculation.otrasDeduccionesPersonalizadas,
        otrasRetenciones: calculation.otrasRetenciones,
        salarioNeto: calculation.salarioNeto,
        fechaCalculo: new Date().toISOString(),
        estado: "aprobado" as const,
        seguroSocialEmpleador: calculation.seguroSocialEmpleador,
        seguroEducativoEmpleador: calculation.seguroEducativoEmpleador,
        riesgoProfesional: calculation.riesgoProfesional,
        fondoCesantia: calculation.fondoCesantia,
      }

      if (existingEntry) {
        updatePayrollEntry(existingEntry.id, payrollData)
      } else {
        addPayrollEntry(payrollData)
      }
    })

    toast({
      title: "Planilla guardada",
      description: "La planilla ha sido guardada exitosamente",
    })
    setCalculatedPayroll([])
  }

  const handleExtrasChange = (employeeId: string, field: string, value: number) => {
    setEmployeeExtras((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || { horasExtras: 0, bonificaciones: 0, otrosIngresos: 0 }),
        [field]: value,
      },
    }))
  }

  const handleViewDetail = (employee: Employee, calculation: ReturnType<typeof calculatePayroll>) => {
    setSelectedEmployeeDetail({ employee, calculation })
    setDetailDialogOpen(true)
  }

  const handleViewDeductions = (employee: Employee, calculation: ReturnType<typeof calculatePayroll>) => {
    setSelectedEmployeeDetail({ employee, calculation })
    setDeductionsDialogOpen(true)
  }

  const totalBruto = calculatedPayroll.reduce((sum, item) => sum + item.calculation.salarioBruto, 0)
  const totalDeducciones = calculatedPayroll.reduce((sum, item) => sum + item.calculation.totalDeducciones, 0)
  const totalNeto = calculatedPayroll.reduce((sum, item) => sum + item.calculation.salarioNeto, 0)
  const totalSeguroSocialEmpleador = calculatedPayroll.reduce(
    (sum, item) => sum + item.calculation.seguroSocialEmpleador,
    0,
  )
  const totalSeguroEducativoEmpleador = calculatedPayroll.reduce(
    (sum, item) => sum + item.calculation.seguroEducativoEmpleador,
    0,
  )
  const totalRiesgoProfesional = calculatedPayroll.reduce((sum, item) => sum + item.calculation.riesgoProfesional, 0)
  const totalFondoCesantia = calculatedPayroll.reduce((sum, item) => sum + item.calculation.fondoCesantia, 0)

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card">
        <SidebarNav />
      </aside>
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Calcular Planilla</h1>
          <p className="text-muted-foreground">
            Calcule la planilla quincenal o mensual con todas las deducciones legales
          </p>
        </div>

        <Card className="mb-6 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Configuración del Período de Pago
            </CardTitle>
            <CardDescription>Seleccione el tipo de período y las fechas para calcular la planilla</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Period type selector */}
              <div className="space-y-2">
                <Label htmlFor="tipo-periodo">Tipo de Período</Label>
                <Select value={tipoPeriodo} onValueChange={(v) => setTipoPeriodo(v as "quincenal" | "mensual")}>
                  <SelectTrigger id="tipo-periodo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quincenal">Quincenal (cada 15 días)</SelectItem>
                    <SelectItem value="mensual">Mensual (mes completo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Month selector */}
                <div className="space-y-2">
                  <Label htmlFor="mes">Mes y Año</Label>
                  <Input
                    id="mes"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>

                {/* Quincena selector (only for quincenal) */}
                {tipoPeriodo === "quincenal" && (
                  <div className="space-y-2">
                    <Label htmlFor="quincena">Quincena</Label>
                    <Select value={selectedQuincena} onValueChange={(v) => setSelectedQuincena(v as "1" | "2")}>
                      <SelectTrigger id="quincena">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Primera Quincena (1-15)</SelectItem>
                        <SelectItem value="2">Segunda Quincena (16-fin de mes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Visual date range display */}
              <div className="rounded-lg bg-primary/10 p-4 border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Período a Pagar</p>
                    <p className="text-2xl font-bold text-primary">{getDateRange()}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {tipoPeriodo === "quincenal" ? "15 días" : "Mes completo"}
                  </Badge>
                </div>
              </div>

              <Button onClick={handleCalculate} className="w-full gap-2" size="lg">
                <Calculator className="h-5 w-5" />
                Calcular Planilla para {getDateRange()}
              </Button>
            </div>
          </CardContent>
        </Card>

        {calculatedPayroll.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resumen de Planilla</CardTitle>
                  <CardDescription>Totales calculados para el período {currentPeriod}</CardDescription>
                </div>
                <Button onClick={handleSavePayroll} className="gap-2">
                  <Save className="h-4 w-4" />
                  Guardar Planilla
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Salario Bruto Total</p>
                  <p className="text-2xl font-bold">
                    ${totalBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Total Deducciones</p>
                  <p className="text-2xl font-bold text-destructive">
                    ${totalDeducciones.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((totalDeducciones / totalBruto) * 100).toFixed(2)}% del bruto
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Salario Neto Total</p>
                  <p className="text-2xl font-bold text-primary">
                    ${totalNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((totalNeto / totalBruto) * 100).toFixed(2)}% del bruto
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Costo Empleador</p>
                  <p className="text-2xl font-bold">
                    $
                    {(
                      totalSeguroSocialEmpleador +
                      totalSeguroEducativoEmpleador +
                      totalRiesgoProfesional +
                      totalFondoCesantia
                    ).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 mb-4">
                <h4 className="font-semibold mb-3">Desglose Detallado de Deducciones</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seguro Social Empleado (9.75%)</span>
                    <span className="font-mono">
                      $
                      {calculatedPayroll
                        .reduce((sum, item) => sum + item.calculation.seguroSocialEmpleado, 0)
                        .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seguro Educativo Empleado (1.25%)</span>
                    <span className="font-mono">
                      $
                      {calculatedPayroll
                        .reduce((sum, item) => sum + item.calculation.seguroEducativo, 0)
                        .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ISR (Impuesto sobre la Renta)</span>
                    <span className="font-mono">
                      $
                      {calculatedPayroll
                        .reduce((sum, item) => sum + item.calculation.isr, 0)
                        .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deducciones Bancarias</span>
                    <span className="font-mono">
                      $
                      {calculatedPayroll
                        .reduce((sum, item) => sum + item.calculation.deduccionesBancarias, 0)
                        .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Otras Deducciones Personalizadas</span>
                    <span className="font-mono">
                      $
                      {calculatedPayroll
                        .reduce((sum, item) => sum + item.calculation.otrasDeduccionesPersonalizadas, 0)
                        .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Otras Retenciones</span>
                    <span className="font-mono">
                      $
                      {calculatedPayroll
                        .reduce((sum, item) => sum + item.calculation.otrasRetenciones, 0)
                        .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-semibold">
                    <span>Total Deducciones</span>
                    <span className="font-mono text-destructive">
                      ${totalDeducciones.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-semibold mb-3">Desglose de Costos Patronales</h4>
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Seguro Social Empleador (13.25%)</p>
                    <p className="text-2xl font-bold">
                      ${totalSeguroSocialEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Seguro Educativo Empleador (1.5%)</p>
                    <p className="text-2xl font-bold">
                      ${totalSeguroEducativoEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Riesgo Profesional (0.98%)</p>
                    <p className="text-2xl font-bold">
                      ${totalRiesgoProfesional.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Fondo de Cesantía (2.25%)</p>
                    <p className="text-2xl font-bold">
                      ${totalFondoCesantia.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-semibold">
                    <span>Total Costo Patronal</span>
                    <span className="font-mono">
                      $
                      {(
                        totalSeguroSocialEmpleador +
                        totalSeguroEducativoEmpleador +
                        totalRiesgoProfesional +
                        totalFondoCesantia
                      ).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Empleados Activos</CardTitle>
            <CardDescription>
              Configure extras y bonificaciones para cada empleado. Las deducciones personales se aplican
              automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Salario Base</TableHead>
                    <TableHead className="text-right">Horas Extras</TableHead>
                    <TableHead className="text-right">Bonificaciones</TableHead>
                    <TableHead className="text-right">Otros Ingresos</TableHead>
                    {calculatedPayroll.length > 0 && (
                      <>
                        <TableHead className="text-right">Deducciones</TableHead>
                        <TableHead className="text-right">Salario Neto</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No hay empleados activos
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeEmployees.map((employee) => {
                      const calculated = calculatedPayroll.find((c) => c.employee.id === employee.id)
                      const totalPersonalDeductions =
                        (employee.deduccionesBancarias || 0) +
                        (employee.prestamos || 0) +
                        (Array.isArray(employee.otrasDeduccionesPersonalizadas)
                          ? employee.otrasDeduccionesPersonalizadas.reduce((sum, d) => {
                              if (!d.activo) return sum
                              if (d.tipo === "fijo") return sum + d.monto
                              return sum + (employee.salarioBase * d.monto) / 100
                            }, 0)
                          : 0)

                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            <div>
                              {employee.nombre} {employee.apellido}
                              {totalPersonalDeductions > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Deducciones: $
                                  {totalPersonalDeductions.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${employee.salarioBase.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="w-24 text-right"
                              value={employeeExtras[employee.id]?.horasExtras || ""}
                              onChange={(e) =>
                                handleExtrasChange(employee.id, "horasExtras", Number.parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="w-24 text-right"
                              value={employeeExtras[employee.id]?.bonificaciones || ""}
                              onChange={(e) =>
                                handleExtrasChange(
                                  employee.id,
                                  "bonificaciones",
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="w-24 text-right"
                              value={employeeExtras[employee.id]?.otrosIngresos || ""}
                              onChange={(e) =>
                                handleExtrasChange(employee.id, "otrosIngresos", Number.parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          {calculated && (
                            <>
                              <TableCell className="text-right font-mono text-destructive">
                                $
                                {calculated.calculation.totalDeducciones.toLocaleString("es-PA", {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                $
                                {calculated.calculation.salarioNeto.toLocaleString("es-PA", {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDetail(employee, calculated.calculation)}
                                    title="Ver detalle completo"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDeductions(employee, calculated.calculation)}
                                    title="Ver desglose de deducciones"
                                  >
                                    <PieChart className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {selectedEmployeeDetail && (
          <>
            <PayrollDetailDialog
              open={detailDialogOpen}
              onOpenChange={setDetailDialogOpen}
              employee={selectedEmployeeDetail.employee}
              calculation={selectedEmployeeDetail.calculation}
            />
            {deductionsDialogOpen && (
              <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
                <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-6">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 z-10"
                      onClick={() => setDeductionsDialogOpen(false)}
                    >
                      <span className="sr-only">Cerrar</span>✕
                    </Button>
                    <DeductionsBreakdown
                      employee={selectedEmployeeDetail.employee}
                      calculation={selectedEmployeeDetail.calculation}
                      showPercentages={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
