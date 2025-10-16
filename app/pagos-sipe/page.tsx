"use client"

import { useState, useMemo, useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { generateSIPEPDF } from "@/lib/sipe-pdf-generator"
import { Calendar, AlertCircle, DollarSign, TrendingUp, Eye, Info, Download, Filter } from "lucide-react"

export default function PagosSIPEPage() {
  const {
    employees,
    sipePayments,
    addOrUpdateSIPEPayment,
    updateSIPEPaymentStatus,
    companies,
    currentCompanyId,
    legalParameters,
  } = usePayroll()

  const now = new Date()
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [selectedYear, setSelectedYear] = useState(previousMonth.getFullYear())
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const currentCompany = companies.find((c) => c.id === currentCompanyId)

  const sipePaymentsData = useMemo(() => {
    if (employees.length === 0) {
      return []
    }

    // Generate periods for the entire year (12 months)
    const periods: string[] = []
    for (let month = 1; month <= 12; month++) {
      periods.push(`${selectedYear}-${String(month).padStart(2, "0")}`)
    }

    // Apply date range filter if set
    let filteredPeriods = periods
    if (startDate && endDate) {
      filteredPeriods = periods.filter((periodo) => {
        return periodo >= startDate && periodo <= endDate
      })
    }

    const round = (num: number) => Math.round(num * 100) / 100

    return filteredPeriods.map((periodo) => {
      const [year, month] = periodo.split("-").map(Number)
      const isDecimoMonth = month === 4 || month === 8 || month === 12

      const seguroSocialEmpleadoRate =
        legalParameters.find((p) => p.tipo === "seguro_social_empleado" && p.activo)?.porcentaje || 9.75
      const seguroSocialEmpleadorRate =
        legalParameters.find((p) => p.tipo === "seguro_social_empleador" && p.activo)?.porcentaje || 13.25
      const seguroEducativoRate =
        legalParameters.find((p) => p.tipo === "seguro_educativo" && p.activo)?.porcentaje || 1.25
      const seguroEducativoEmpleadorRate =
        legalParameters.find((p) => p.tipo === "seguro_educativo_empleador" && p.activo)?.porcentaje || 1.5
      const riesgoProfesionalRate =
        legalParameters.find((p) => p.tipo === "riesgo_profesional" && p.activo)?.porcentaje || 0.98

      let totalSeguroSocialEmpleado = 0
      let totalSeguroSocialEmpleador = 0
      let totalSeguroEducativoEmpleado = 0
      let totalSeguroEducativoEmpleador = 0
      let totalRiesgoProfesional = 0
      let totalISR = 0
      let totalDecimoEmpleado = 0
      let totalDecimoPatrono = 0
      let totalDecimoISR = 0

      // Calculate for ALL employees based on their base salary
      for (const employee of employees) {
        const salarioBase = employee.salarioBase

        // Regular monthly contributions
        totalSeguroSocialEmpleado += round((salarioBase * seguroSocialEmpleadoRate) / 100)
        totalSeguroSocialEmpleador += round((salarioBase * seguroSocialEmpleadorRate) / 100)
        totalSeguroEducativoEmpleado += round((salarioBase * seguroEducativoRate) / 100)
        totalSeguroEducativoEmpleador += round((salarioBase * seguroEducativoEmpleadorRate) / 100)
        totalRiesgoProfesional += round((salarioBase * riesgoProfesionalRate) / 100)

        // Calculate ISR
        const salarioAnual = salarioBase * 13
        let isrAnual = 0
        if (salarioAnual > 11000) {
          if (salarioAnual <= 50000) {
            isrAnual = ((salarioAnual - 11000) * 15) / 100
          } else {
            isrAnual = 5850 + ((salarioAnual - 50000) * 25) / 100
          }
        }
        const isrMensual = round(isrAnual / 13)
        totalISR += isrMensual

        // Add décimo deductions if it's a décimo month
        if (isDecimoMonth) {
          const decimoTotal = salarioBase // 1 month salary
          const decimoPago = round(decimoTotal / 3) // Divided into 3 payments
          const decimoCSS = round((decimoPago * 7.25) / 100)
          const decimoCSSPatrono = round((decimoPago * 10.75) / 100)
          const decimoISR = round(isrMensual / 3) // ISR divided into 3 payments

          totalDecimoEmpleado += decimoCSS
          totalDecimoPatrono += decimoCSSPatrono
          totalDecimoISR += decimoISR
        }
      }

      // Round all totals
      totalSeguroSocialEmpleado = round(totalSeguroSocialEmpleado)
      totalSeguroSocialEmpleador = round(totalSeguroSocialEmpleador)
      totalSeguroEducativoEmpleado = round(totalSeguroEducativoEmpleado)
      totalSeguroEducativoEmpleador = round(totalSeguroEducativoEmpleador)
      totalRiesgoProfesional = round(totalRiesgoProfesional)
      totalISR = round(totalISR)
      totalDecimoEmpleado = round(totalDecimoEmpleado)
      totalDecimoPatrono = round(totalDecimoPatrono)
      totalDecimoISR = round(totalDecimoISR)

      // Add décimo to totals if it's a décimo month
      if (isDecimoMonth) {
        totalSeguroSocialEmpleado = round(totalSeguroSocialEmpleado + totalDecimoEmpleado)
        totalSeguroSocialEmpleador = round(totalSeguroSocialEmpleador + totalDecimoPatrono)
        totalISR = round(totalISR + totalDecimoISR)
      }

      // Calculate payment date (15th of next month)
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const fechaLimite = `${nextYear}-${String(nextMonth).padStart(2, "0")}-15`

      const totalAPagar = round(
        totalSeguroSocialEmpleado +
          totalSeguroSocialEmpleador +
          totalSeguroEducativoEmpleado +
          totalSeguroEducativoEmpleador +
          totalRiesgoProfesional +
          totalISR, // ISR is now included in SIPE total
      )

      const savedPayment = sipePayments.find((p) => p.periodo === periodo)
      const estado = savedPayment?.estado || "pendiente"
      const fechaPago = savedPayment?.fechaPago
      const referenciaPago = savedPayment?.referenciaPago

      return {
        periodo,
        fechaLimite,
        totalSeguroSocialEmpleado,
        totalSeguroSocialEmpleador,
        totalSeguroEducativoEmpleado,
        totalSeguroEducativoEmpleador,
        totalRiesgoProfesional,
        totalISR,
        totalDecimoEmpleado,
        totalDecimoPatrono,
        totalDecimoISR,
        isDecimoMonth,
        totalAPagar,
        estado,
        fechaPago,
        referenciaPago,
      }
    })
  }, [employees, selectedYear, startDate, endDate, sipePayments, legalParameters])

  useEffect(() => {
    sipePaymentsData.forEach((payment) => {
      const savedPayment = sipePayments.find((p) => p.periodo === payment.periodo)
      if (!savedPayment) {
        addOrUpdateSIPEPayment(payment)
      }
    })
  }, [sipePaymentsData, sipePayments, addOrUpdateSIPEPayment])

  const currentMonth = new Date().toISOString().slice(0, 7)
  const upcomingPayments = sipePaymentsData.filter((p) => p.fechaLimite >= new Date().toISOString().slice(0, 10))

  const totalAnual = sipePaymentsData.reduce((sum, p) => sum + p.totalAPagar, 0)

  const previousMonthPeriod = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`
  const previousMonthPayment = sipePaymentsData.find((p) => p.periodo === previousMonthPeriod)

  const selectedPeriodEmployees = useMemo(() => {
    if (!selectedPeriod) return []

    console.log("[v0] === ISR CALCULATION DEBUG ===")
    console.log("[v0] Selected Period:", selectedPeriod)

    const [year, month] = selectedPeriod.split("-").map(Number)
    const isDecimoMonth = month === 4 || month === 8 || month === 12
    console.log("[v0] Is Décimo Month:", isDecimoMonth)

    const round = (num: number) => Math.round(num * 100) / 100

    const seguroSocialEmpleadoRate =
      legalParameters.find((p) => p.tipo === "seguro_social_empleado" && p.activo)?.porcentaje || 9.75
    const seguroSocialEmpleadorRate =
      legalParameters.find((p) => p.tipo === "seguro_social_empleador" && p.activo)?.porcentaje || 13.25
    const seguroEducativoRate =
      legalParameters.find((p) => p.tipo === "seguro_educativo" && p.activo)?.porcentaje || 1.25
    const seguroEducativoEmpleadorRate =
      legalParameters.find((p) => p.tipo === "seguro_educativo_empleador" && p.activo)?.porcentaje || 1.5
    const riesgoProfesionalRate =
      legalParameters.find((p) => p.tipo === "riesgo_profesional" && p.activo)?.porcentaje || 0.98

    let totalISRCalculated = 0

    const employeeData = employees.map((employee) => {
      const salarioBase = employee.salarioBase
      const seguroSocialEmpleado = round((salarioBase * seguroSocialEmpleadoRate) / 100)
      const seguroSocialEmpleador = round((salarioBase * seguroSocialEmpleadorRate) / 100)
      const seguroEducativoEmpleado = round((salarioBase * seguroEducativoRate) / 100)
      const seguroEducativoEmpleador = round((salarioBase * seguroEducativoEmpleadorRate) / 100)
      const riesgoProfesional = round((salarioBase * riesgoProfesionalRate) / 100)

      const salarioAnual = salarioBase * 13
      let isrAnual = 0
      if (salarioAnual > 11000) {
        if (salarioAnual <= 50000) {
          isrAnual = ((salarioAnual - 11000) * 15) / 100
        } else {
          isrAnual = 5850 + ((salarioAnual - 50000) * 25) / 100
        }
      }
      const isr = round(isrAnual / 13)

      console.log(`[v0] Employee: ${employee.nombre} ${employee.apellido}`)
      console.log(`[v0]   Salario Base: $${salarioBase}`)
      console.log(`[v0]   Salario Anual: $${salarioAnual}`)
      console.log(`[v0]   ISR Anual: $${isrAnual}`)
      console.log(`[v0]   ISR Mensual: $${isr}`)

      totalISRCalculated += isr

      let totalDecimoEmpleado = 0
      let totalDecimoPatrono = 0
      let totalDecimoISR = 0

      if (isDecimoMonth) {
        const decimoTotal = salarioBase
        const decimoPago = round(decimoTotal / 3)
        totalDecimoEmpleado = round((decimoPago * 7.25) / 100)
        totalDecimoPatrono = round((decimoPago * 10.75) / 100)
        totalDecimoISR = round(isr / 3)
        console.log(`[v0]   Décimo ISR: $${totalDecimoISR}`)
      }

      const totalAPagar = round(
        seguroSocialEmpleado +
          seguroSocialEmpleador +
          seguroEducativoEmpleado +
          seguroEducativoEmpleador +
          riesgoProfesional +
          isr +
          (isDecimoMonth ? totalDecimoEmpleado + totalDecimoPatrono + totalDecimoISR : 0),
      )

      console.log(`[v0]   Total a Pagar: $${totalAPagar}`)

      return {
        employee,
        entry: {
          salarioBruto: salarioBase,
        },
        seguroSocialEmpleado,
        seguroSocialEmpleador,
        seguroEducativoEmpleado,
        seguroEducativoEmpleador,
        riesgoProfesional,
        isr,
        totalDecimoEmpleado,
        totalDecimoPatrono,
        totalDecimoISR,
        isDecimoMonth,
        totalAPagar,
        hasPayrollEntry: true,
      }
    })

    console.log(`[v0] Total ISR Calculated: $${round(totalISRCalculated)}`)
    if (isDecimoMonth) {
      const totalDecimoISR = employeeData.reduce((sum, item) => sum + (item.totalDecimoISR || 0), 0)
      console.log(`[v0] Total Décimo ISR: $${round(totalDecimoISR)}`)
      console.log(`[v0] Total ISR (Regular + Décimo): $${round(totalISRCalculated + totalDecimoISR)}`)
    }
    console.log("[v0] === END ISR DEBUG ===")

    return employeeData
  }, [selectedPeriod, employees, legalParameters])

  const handleTogglePaymentStatus = (periodo: string, currentEstado: "pendiente" | "pagado") => {
    const newEstado = currentEstado === "pagado" ? "pendiente" : "pagado"
    const fechaPago = newEstado === "pagado" ? new Date().toISOString() : undefined
    updateSIPEPaymentStatus(periodo, newEstado, fechaPago)
  }

  const handleDownloadPDF = (periodo: string) => {
    const payment = sipePaymentsData.find((p) => p.periodo === periodo)
    if (!payment) return

    const round = (num: number) => Math.round(num * 100) / 100
    const [year, month] = periodo.split("-").map(Number)
    const isDecimoMonth = month === 4 || month === 8 || month === 12

    const periodEmployees = employees.map((employee) => {
      const salarioBase = employee.salarioBase

      // Calculate ISR
      const salarioAnual = salarioBase * 13
      let isrAnual = 0
      if (salarioAnual > 11000) {
        if (salarioAnual <= 50000) {
          isrAnual = ((salarioAnual - 11000) * 15) / 100
        } else {
          isrAnual = 5850 + ((salarioAnual - 50000) * 25) / 100
        }
      }
      const isr = round(isrAnual / 13)

      let totalDecimoISR = 0
      if (isDecimoMonth) {
        totalDecimoISR = round(isr / 3)
      }

      return {
        employee,
        entry: { salarioBruto: salarioBase },
        seguroSocialEmpleado: round((salarioBase * 9.75) / 100),
        seguroSocialEmpleador: round((salarioBase * 13.25) / 100),
        seguroEducativoEmpleado: round((salarioBase * 1.25) / 100),
        seguroEducativoEmpleador: round((salarioBase * 1.5) / 100),
        riesgoProfesional: round((salarioBase * 0.98) / 100),
        isr: isr + (isDecimoMonth ? totalDecimoISR : 0), // Include décimo ISR if applicable
        totalAPagar: round(
          round((salarioBase * 9.75) / 100) + // CSS Empleado
            round((salarioBase * 13.25) / 100) + // CSS Empleador
            round((salarioBase * 1.25) / 100) + // Seg Educ Empleado
            round((salarioBase * 1.5) / 100) + // Seg Educ Empleador
            round((salarioBase * 0.98) / 100) + // Riesgo Profesional
            isr + // ISR
            (isDecimoMonth ? totalDecimoISR : 0), // Décimo ISR if applicable
        ),
      }
    })

    generateSIPEPDF({
      payment,
      employees: periodEmployees,
      companyName: currentCompany?.nombre || "Mi Empresa",
    })
  }

  const handleClearFilters = () => {
    setStartDate("")
    setEndDate("")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card">
        <SidebarNav />
      </aside>
      <main className="flex-1 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Pagos al SIPE</h1>
              <p className="text-muted-foreground">Sistema Integrado de Pagos Electrónicos - Caja de Seguro Social</p>
            </div>
          </div>
        </div>

        {employees.length === 0 && (
          <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-900 dark:text-red-100">No hay empleados registrados</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-200">
              Debe registrar empleados antes de poder calcular pagos SIPE. Vaya a la sección de Empleados para agregar
              empleados a su empresa.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Cálculo Automático del Mes Anterior</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            El SIPE se calcula automáticamente para TODOS los empleados registrados basándose en sus salarios base. Los
            pagos se calculan para el mes anterior. Por ejemplo, en{" "}
            {now.toLocaleDateString("es-PA", { month: "long", year: "numeric" })} se paga la planilla de{" "}
            {previousMonth.toLocaleDateString("es-PA", { month: "long", year: "numeric" })}. La fecha límite de pago es
            el día 15 del mes siguiente al período de planilla.
          </AlertDescription>
        </Alert>

        {upcomingPayments.length > 0 && (
          <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">Pagos Próximos</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Tiene {upcomingPayments.length} pago(s) pendiente(s) al SIPE. Los pagos deben realizarse antes del día 15
              del mes siguiente al período de planilla.
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Filtrar por Período</CardTitle>
                <CardDescription>Selecciona un rango de fechas para ver pagos específicos</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? "Ocultar" : "Mostrar"} Filtros
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha Inicio (YYYY-MM)</Label>
                  <Input
                    id="startDate"
                    type="month"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="2025-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Fecha Fin (YYYY-MM)</Label>
                  <Input
                    id="endDate"
                    type="month"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="2025-12"
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={handleClearFilters} className="w-full bg-transparent">
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
              {startDate && endDate && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Mostrando pagos desde <span className="font-semibold">{startDate}</span> hasta{" "}
                    <span className="font-semibold">{endDate}</span>
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {previousMonthPayment && (
          <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="text-green-900 dark:text-green-100">
                Pago del Mes Anterior - {previousMonth.toLocaleDateString("es-PA", { month: "long", year: "numeric" })}
              </CardTitle>
              <CardDescription className="text-green-800 dark:text-green-200">
                Este es el pago que debe realizar este mes (antes del 15 de{" "}
                {now.toLocaleDateString("es-PA", { month: "long" })})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Total SIPE (incluye ISR)</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    ${previousMonthPayment.totalAPagar.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    CSS + Seg. Educativo + Riesgo Prof. + ISR
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Fecha Límite</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {new Date(previousMonthPayment.fechaLimite).toLocaleDateString("es-PA")}
                  </p>
                </div>
              </div>
              <Button
                className="mt-4 bg-green-600 hover:bg-green-700"
                onClick={() => setSelectedPeriod(previousMonthPayment.periodo)}
              >
                Ver Desglose Detallado
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total SIPE {selectedYear}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalAnual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">CSS + Seg. Educativo + Riesgo + ISR</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{upcomingPayments.length}</div>
              <p className="text-xs text-muted-foreground">Próximos a vencer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Períodos Procesados</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sipePaymentsData.length}</div>
              <p className="text-xs text-muted-foreground">
                {startDate && endDate ? "En el rango seleccionado" : `En el año ${selectedYear}`}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendario de Pagos SIPE (incluye ISR)</CardTitle>
            <CardDescription>
              Detalle de aportes mensuales a la Caja de Seguro Social, Seguro Educativo, Riesgo Profesional e Impuesto
              Sobre la Renta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead className="text-right">CSS Empleado</TableHead>
                    <TableHead className="text-right">CSS Patrono</TableHead>
                    <TableHead className="text-right">Seg. Educ. Emp.</TableHead>
                    <TableHead className="text-right">Seg. Educ. Patr.</TableHead>
                    <TableHead className="text-right">
                      Riesgo Prof. (
                      {legalParameters.find((p) => p.tipo === "riesgo_profesional" && p.activo)?.porcentaje || 0.98}%)
                    </TableHead>
                    <TableHead className="text-right">ISR</TableHead>
                    <TableHead className="text-right">Décimo CSS</TableHead>
                    <TableHead className="text-right">Décimo ISR</TableHead>
                    <TableHead className="text-right">Total SIPE</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Pagado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sipePaymentsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center text-muted-foreground">
                        {startDate && endDate
                          ? "No hay pagos SIPE en el rango de fechas seleccionado"
                          : `No hay pagos SIPE registrados para el año ${selectedYear}`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sipePaymentsData.map((payment) => {
                      const isUpcoming = payment.fechaLimite >= new Date().toISOString().slice(0, 10)
                      const isPreviousMonth = payment.periodo === previousMonthPeriod

                      return (
                        <TableRow
                          key={payment.periodo}
                          className={isPreviousMonth ? "bg-green-50 dark:bg-green-950" : ""}
                        >
                          <TableCell className="font-medium">
                            {payment.periodo}
                            {isPreviousMonth && (
                              <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-300">
                                A Pagar Este Mes
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(payment.fechaLimite).toLocaleDateString("es-PA")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            ${payment.totalSeguroSocialEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            ${payment.totalSeguroSocialEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            $
                            {payment.totalSeguroEducativoEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            $
                            {payment.totalSeguroEducativoEmpleador.toLocaleString("es-PA", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            ${payment.totalRiesgoProfesional.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-green-600 font-semibold">
                            ${(payment.totalISR || 0).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-purple-600">
                            {payment.isDecimoMonth ? (
                              <>
                                $
                                {(
                                  (payment.totalDecimoEmpleado || 0) + (payment.totalDecimoPatrono || 0)
                                ).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-purple-600">
                            {payment.isDecimoMonth ? (
                              <>
                                ${(payment.totalDecimoISR || 0).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-lg text-green-600">
                            ${payment.totalAPagar.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                payment.estado === "pagado" ? "default" : isUpcoming ? "secondary" : "destructive"
                              }
                            >
                              {payment.estado === "pagado" ? "Pagado" : isUpcoming ? "Pendiente" : "Vencido"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={payment.estado === "pagado"}
                              onCheckedChange={() => handleTogglePaymentStatus(payment.periodo, payment.estado)}
                              className="mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedPeriod(payment.periodo)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(payment.periodo)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Información sobre Pagos SIPE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">¿Qué es el SIPE?</h3>
              <p className="text-sm text-muted-foreground">
                El Sistema Integrado de Pagos Electrónicos (SIPE) es la plataforma de la Caja de Seguro Social de Panamá
                para el pago de las cuotas obrero-patronales, Seguro Educativo, Riesgo Profesional e Impuesto Sobre la
                Renta.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Fecha de Pago</h3>
              <p className="text-sm text-muted-foreground">
                Los pagos deben realizarse antes del día 15 del mes siguiente al período de planilla. Por ejemplo, la
                planilla de enero debe pagarse antes del 15 de febrero.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Componentes del Pago SIPE</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Seguro Social Empleado: 9.75% del salario bruto</li>
                <li>Seguro Social Patrono: 13.25% del salario bruto</li>
                <li>Seguro Educativo Empleado: 1.25% del salario bruto</li>
                <li>Seguro Educativo Patrono: 1.50% del salario bruto</li>
                <li className="font-semibold text-green-700">
                  Riesgo Profesional:{" "}
                  {legalParameters.find((p) => p.tipo === "riesgo_profesional" && p.activo)?.porcentaje || 0.98}% del
                  salario bruto (varía según actividad)
                </li>
                <li className="font-semibold text-green-700">
                  Impuesto Sobre la Renta (ISR): Calculado según tabla progresiva e incluido en el pago SIPE
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Impuesto Sobre la Renta (ISR)</h3>
              <p className="text-sm text-muted-foreground">
                El ISR se calcula anualmente según la tabla progresiva y se divide entre 13 meses. El ISR está incluido
                en el total del pago SIPE y debe pagarse junto con las demás deducciones antes del día 15 del mes
                siguiente.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Deducciones del Décimo Tercer Mes</h3>
              <p className="text-sm text-muted-foreground">
                Las deducciones del Décimo Tercer Mes (CSS 7.25% empleado + 10.75% patrono + ISR) se incluyen en el pago
                SIPE SOLO en los meses cuando se paga el décimo: <strong>Abril, Agosto y Diciembre</strong>. En los
                demás meses, el SIPE no incluye deducciones del décimo.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Desglose por Empleado - {selectedPeriod}</DialogTitle>
            <DialogDescription>
              Cálculo detallado de aportes SIPE e ISR por cada empleado (incluye todos los empleados registrados)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Salario Bruto</TableHead>
                    <TableHead className="text-right">CSS Emp. (9.75%)</TableHead>
                    <TableHead className="text-right">CSS Patr. (13.25%)</TableHead>
                    <TableHead className="text-right">Seg. Ed. Emp. (1.25%)</TableHead>
                    <TableHead className="text-right">Seg. Ed. Patr. (1.50%)</TableHead>
                    <TableHead className="text-right">
                      Riesgo Prof. (
                      {legalParameters.find((p) => p.tipo === "riesgo_profesional" && p.activo)?.porcentaje || 0.98}%)
                    </TableHead>
                    <TableHead className="text-right">ISR</TableHead>
                    <TableHead className="text-right">Décimo CSS</TableHead>
                    <TableHead className="text-right">Décimo ISR</TableHead>
                    <TableHead className="text-right">Total SIPE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPeriodEmployees.map((item, index) => (
                    <TableRow
                      key={item.employee?.id || index}
                      className={!item.hasPayrollEntry ? "bg-amber-50 dark:bg-amber-950" : ""}
                    >
                      <TableCell className="font-medium">
                        {item.employee?.nombre} {item.employee?.apellido}
                        {!item.hasPayrollEntry && (
                          <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
                            Sin Planilla
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.entry.salarioBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ${item.seguroSocialEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ${item.seguroSocialEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ${item.seguroEducativoEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ${item.seguroEducativoEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ${item.riesgoProfesional.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-blue-600">
                        ${item.isr.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-purple-600">
                        {item.isDecimoMonth ? (
                          <>
                            $
                            {((item.totalDecimoEmpleado || 0) + (item.totalDecimoPatrono || 0)).toLocaleString(
                              "es-PA",
                              { minimumFractionDigits: 2 },
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-purple-600">
                        {item.isDecimoMonth ? (
                          <>${(item.totalDecimoISR || 0).toLocaleString("es-PA", { minimumFractionDigits: 2 })}</>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ${item.totalAPagar.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-semibold mb-3">Resumen del Período</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Empleados</p>
                  <p className="font-bold">{selectedPeriodEmployees.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aportes Empleados</p>
                  <p className="font-bold">
                    $
                    {selectedPeriodEmployees
                      .reduce((sum, item) => sum + item.seguroSocialEmpleado + item.seguroEducativoEmpleado, 0)
                      .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aportes Patronales</p>
                  <p className="font-bold">
                    $
                    {selectedPeriodEmployees
                      .reduce(
                        (sum, item) =>
                          sum + item.seguroSocialEmpleador + item.seguroEducativoEmpleador + item.riesgoProfesional,
                        0,
                      )
                      .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total ISR</p>
                  <p className="font-bold text-blue-600">
                    $
                    {selectedPeriodEmployees
                      .reduce((sum, item) => sum + item.isr, 0)
                      .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total SIPE (incluye ISR)</p>
                  <p className="font-bold text-lg">
                    $
                    {selectedPeriodEmployees
                      .reduce((sum, item) => sum + item.totalAPagar, 0)
                      .toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
