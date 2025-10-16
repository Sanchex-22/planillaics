"use client"

import { useState } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, Calendar } from "lucide-react"
import { exportToExcel } from "@/lib/export-utils"
import { useToast } from "@/hooks/use-toast"

export default function ReportesPage() {
  const { employees, payrollEntries, decimoTercerMes, legalParameters, currentCompany, companies } = usePayroll()
  const { toast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportType, setReportType] = useState<"mensual" | "anual" | "decimo">("mensual")

  const periodPayroll = payrollEntries.filter((e) => e.periodo === selectedPeriod)
  const yearPayroll = payrollEntries.filter((e) => e.periodo.startsWith(selectedYear.toString()))
  const yearDecimo = decimoTercerMes.filter((d) => d.anio === selectedYear)

  const companyName = companies.find((c) => c.id === currentCompany)?.nombre || "Empresa"

  const handleExportMensual = () => {
    if (periodPayroll.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos de planilla para el período seleccionado",
        variant: "destructive",
      })
      return
    }

    const data = periodPayroll.map((entry) => {
      const employee = employees.find((e) => e.id === entry.empleadoId)
      return {
        Empresa: companyName,
        Cédula: employee?.cedula || "",
        Nombre: employee?.nombre || "",
        Apellido: employee?.apellido || "",
        Departamento: employee?.departamento || "",
        Cargo: employee?.cargo || "",
        "Salario Base": employee?.salarioBase || 0,
        "Horas Extras": entry.horasExtras,
        Bonificaciones: entry.bonificaciones,
        "Otros Ingresos": entry.otrosIngresos,
        "Salario Bruto": entry.salarioBruto,
        "Seguro Social Empleado": entry.seguroSocialEmpleado,
        "Seguro Educativo": entry.seguroEducativo,
        ISR: entry.isr,
        "Deducciones Bancarias": entry.deduccionesBancarias || 0,
        Préstamos: entry.prestamos || 0,
        "Otras Deducciones": entry.otrasDeduccionesPersonalizadas || 0,
        "Total Deducciones Legales": entry.seguroSocialEmpleado + entry.seguroEducativo + entry.isr,
        "Total Deducciones Personales":
          (entry.deduccionesBancarias || 0) + (entry.prestamos || 0) + (entry.otrasDeduccionesPersonalizadas || 0),
        "Total Deducciones": entry.totalDeducciones,
        "Salario Neto": entry.salarioNeto,
        "Seguro Social Empleador": entry.seguroSocialEmpleador,
        "Seguro Educativo Empleador": entry.seguroEducativoEmpleador,
        "Riesgo Profesional": entry.riesgoProfesional,
        "Costo Total Empresa":
          entry.salarioBruto + entry.seguroSocialEmpleador + entry.seguroEducativoEmpleador + entry.riesgoProfesional,
        Estado: entry.estado,
      }
    })

    exportToExcel(data, `${companyName}_Planilla_${selectedPeriod}`)
    toast({
      title: "Reporte exportado",
      description: "El reporte ha sido descargado exitosamente",
    })
  }

  const handleExportAnual = () => {
    if (yearPayroll.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos de planilla para el año seleccionado",
        variant: "destructive",
      })
      return
    }

    const employeeYearData = employees.map((employee) => {
      const employeePayroll = yearPayroll.filter((e) => e.empleadoId === employee.id)
      const totalBruto = employeePayroll.reduce((sum, e) => sum + e.salarioBruto, 0)
      const totalSeguroSocial = employeePayroll.reduce((sum, e) => sum + e.seguroSocialEmpleado, 0)
      const totalSeguro = employeePayroll.reduce((sum, e) => sum + e.seguroEducativo, 0)
      const totalISR = employeePayroll.reduce((sum, e) => sum + e.isr, 0)
      const totalDeduccionesPersonales = employeePayroll.reduce(
        (sum, e) => sum + (e.deduccionesBancarias || 0) + (e.prestamos || 0) + (e.otrasDeduccionesPersonalizadas || 0),
        0,
      )
      const totalNeto = employeePayroll.reduce((sum, e) => sum + e.salarioNeto, 0)
      const totalCostoPatronal = employeePayroll.reduce(
        (sum, e) => sum + e.seguroSocialEmpleador + e.seguroEducativoEmpleador + e.riesgoProfesional,
        0,
      )

      return {
        Empresa: companyName,
        Cédula: employee.cedula,
        Nombre: employee.nombre,
        Apellido: employee.apellido,
        Departamento: employee.departamento,
        "Meses Trabajados": employeePayroll.length,
        "Total Salario Bruto": totalBruto,
        "Total Seguro Social": totalSeguroSocial,
        "Total Seguro Educativo": totalSeguro,
        "Total ISR": totalISR,
        "Total Deducciones Personales": totalDeduccionesPersonales,
        "Total Salario Neto": totalNeto,
        "Total Costo Patronal": totalCostoPatronal,
        "Costo Total Empresa": totalBruto + totalCostoPatronal,
      }
    })

    exportToExcel(employeeYearData, `${companyName}_Planilla_Anual_${selectedYear}`)
    toast({
      title: "Reporte exportado",
      description: "El reporte anual ha sido descargado exitosamente",
    })
  }

  const handleExportDecimo = () => {
    if (yearDecimo.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos de décimo tercer mes para el año seleccionado",
        variant: "destructive",
      })
      return
    }

    const data = yearDecimo.map((decimo) => {
      const employee = employees.find((e) => e.id === decimo.empleadoId)
      return {
        Empresa: companyName,
        Cédula: employee?.cedula || "",
        Nombre: employee?.nombre || "",
        Apellido: employee?.apellido || "",
        Departamento: employee?.departamento || "",
        Año: decimo.anio,
        "Salario Promedio": decimo.salarioPromedio,
        "Meses Trabajados": decimo.mesesTrabajados,
        "Monto Total": decimo.montoTotal,
        "Pago Abril": decimo.pagoAbril,
        "Pago Agosto": decimo.pagoAgosto,
        "Pago Diciembre": decimo.pagoDiciembre,
        ISR: decimo.isr,
        "Monto Neto": decimo.montoNeto,
        Estado: decimo.estado,
        "Fecha Cálculo": new Date(decimo.fechaCalculo).toLocaleDateString("es-PA"),
      }
    })

    exportToExcel(data, `${companyName}_Decimo_Tercer_Mes_${selectedYear}`)
    toast({
      title: "Reporte exportado",
      description: "El reporte de décimo tercer mes ha sido descargado exitosamente",
    })
  }

  const totalBrutoMensual = periodPayroll.reduce((sum, e) => sum + e.salarioBruto, 0)
  const totalNetoMensual = periodPayroll.reduce((sum, e) => sum + e.salarioNeto, 0)
  const totalBrutoAnual = yearPayroll.reduce((sum, e) => sum + e.salarioBruto, 0)
  const totalNetoAnual = yearPayroll.reduce((sum, e) => sum + e.salarioNeto, 0)
  const totalDecimo = yearDecimo.reduce((sum, d) => sum + d.montoProporcional, 0)

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card">
        <SidebarNav />
      </aside>
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground">Genere y exporte reportes de planilla en formato Excel</p>
        </div>

        <Tabs value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="mensual">Reporte Mensual</TabsTrigger>
            <TabsTrigger value="anual">Reporte Anual</TabsTrigger>
            <TabsTrigger value="decimo">Décimo Tercer Mes</TabsTrigger>
          </TabsList>

          <TabsContent value="mensual">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Reporte de Planilla Mensual</CardTitle>
                <CardDescription>Exporte el detalle completo de la planilla de un mes específico</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="periodo-mensual">Período (Mes/Año)</Label>
                    <Input
                      id="periodo-mensual"
                      type="month"
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleExportMensual} className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar a Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Empleados</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{periodPayroll.length}</div>
                  <p className="text-xs text-muted-foreground">En planilla</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Salario Bruto</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalBrutoMensual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">Total del mes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Salario Neto</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ${totalNetoMensual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">A pagar</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vista Previa del Reporte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead className="text-right">Salario Bruto</TableHead>
                        <TableHead className="text-right">Deducciones</TableHead>
                        <TableHead className="text-right">Salario Neto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodPayroll.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No hay datos para el período seleccionado
                          </TableCell>
                        </TableRow>
                      ) : (
                        periodPayroll.slice(0, 10).map((entry) => {
                          const employee = employees.find((e) => e.id === entry.empleadoId)
                          const totalDeducciones =
                            entry.seguroSocialEmpleado +
                            entry.seguroEducativo +
                            entry.isr +
                            entry.deduccionesBancarias +
                            entry.prestamos +
                            entry.otrasDeduccionesPersonalizadas
                          return (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium">
                                {employee?.nombre} {employee?.apellido}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                ${entry.salarioBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-mono text-destructive">
                                ${totalDeducciones.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                ${entry.salarioNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {periodPayroll.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Mostrando 10 de {periodPayroll.length} registros. Exporte para ver todos.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anual">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Reporte de Planilla Anual</CardTitle>
                <CardDescription>Exporte el resumen anual de planilla por empleado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="year-anual">Año</Label>
                    <Input
                      id="year-anual"
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                      min="2000"
                      max="2100"
                    />
                  </div>
                  <Button onClick={handleExportAnual} className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar a Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Salario Bruto Anual</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalBrutoAnual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">Total del año {selectedYear}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Salario Neto Anual</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ${totalNetoAnual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">Pagado en el año</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vista Previa del Reporte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead className="text-center">Meses</TableHead>
                        <TableHead className="text-right">Total Bruto</TableHead>
                        <TableHead className="text-right">Total Neto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No hay empleados registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        employees.slice(0, 10).map((employee) => {
                          const employeePayroll = yearPayroll.filter((e) => e.empleadoId === employee.id)
                          const totalBruto = employeePayroll.reduce((sum, e) => sum + e.salarioBruto, 0)
                          const totalNeto = employeePayroll.reduce((sum, e) => sum + e.salarioNeto, 0)
                          return (
                            <TableRow key={employee.id}>
                              <TableCell className="font-medium">
                                {employee.nombre} {employee.apellido}
                              </TableCell>
                              <TableCell className="text-center">{employeePayroll.length}</TableCell>
                              <TableCell className="text-right font-mono">
                                ${totalBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                ${totalNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {employees.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Mostrando 10 de {employees.length} empleados. Exporte para ver todos.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="decimo">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Reporte de Décimo Tercer Mes</CardTitle>
                <CardDescription>Exporte el cálculo del décimo tercer mes por empleado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="year-decimo">Año</Label>
                    <Input
                      id="year-decimo"
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                      min="2000"
                      max="2100"
                    />
                  </div>
                  <Button onClick={handleExportDecimo} className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar a Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Décimo Tercer Mes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  ${totalDecimo.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Total a pagar año {selectedYear}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vista Previa del Reporte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead className="text-right">Salario Promedio</TableHead>
                        <TableHead className="text-center">Meses</TableHead>
                        <TableHead className="text-right">Monto a Pagar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yearDecimo.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No hay datos de décimo tercer mes para el año seleccionado
                          </TableCell>
                        </TableRow>
                      ) : (
                        yearDecimo.slice(0, 10).map((decimo) => {
                          const employee = employees.find((e) => e.id === decimo.empleadoId)
                          return (
                            <TableRow key={decimo.id}>
                              <TableCell className="font-medium">
                                {employee?.nombre} {employee?.apellido}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                ${decimo.salarioPromedio.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center">{decimo.mesesTrabajados}</TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                ${decimo.montoNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {yearDecimo.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Mostrando 10 de {yearDecimo.length} registros. Exporte para ver todos.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
