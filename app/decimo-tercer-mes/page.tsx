"use client"

import { useState, useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator, Save, DollarSign, Eye, Calendar, AlertCircle, Download, FileText } from "lucide-react"
import { calculateDecimoTercerMesWithDeductions } from "@/lib/payroll-calculations"
import type { Employee } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { generateDecimoPDF, generateDecimoPaymentVoucher } from "@/lib/decimo-pdf-generator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DecimoTercerMesPage() {
  const { employees, payrollEntries, decimoTercerMes, addDecimoTercerMes, legalParameters, isrBrackets } = usePayroll()
  const { toast } = useToast()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [calculatedDecimo, setCalculatedDecimo] = useState<
    Array<{
      employee: Employee
      calculation: ReturnType<typeof calculateDecimoTercerMesWithDeductions>
    }>
  >([])
  const [selectedEmployee, setSelectedEmployee] = useState<{
    employee: Employee
    calculation: ReturnType<typeof calculateDecimoTercerMesWithDeductions>
  } | null>(null)

  useEffect(() => {
    console.log("[v0] Décimo Tercer Mes - Employees:", employees.length)
    console.log("[v0] Décimo Tercer Mes - Payroll Entries:", payrollEntries.length)
    console.log("[v0] Décimo Tercer Mes - Active Employees:", employees.filter((e) => e.estado === "activo").length)
  }, [employees, payrollEntries])

  const activeEmployees = employees.filter((e) => e.estado === "activo")
  const yearDecimo = decimoTercerMes.filter((d) => d.anio === selectedYear)

  const handleCalculate = () => {
    console.log("[v0] Calculating décimo tercer mes for year:", selectedYear)
    console.log("[v0] Active employees:", activeEmployees.length)

    if (activeEmployees.length === 0) {
      toast({
        title: "No hay empleados activos",
        description: "Debe agregar empleados activos antes de calcular el décimo tercer mes",
        variant: "destructive",
      })
      return
    }

    const results = activeEmployees.map((employee) => {
      const calculation = calculateDecimoTercerMesWithDeductions(
        employee,
        payrollEntries,
        selectedYear,
        legalParameters,
        isrBrackets,
      )
      return { employee, calculation }
    })

    setCalculatedDecimo(results)
    toast({
      title: "Décimo Tercer Mes calculado",
      description: `Se ha calculado el décimo tercer mes para ${results.length} empleados en tres pagos`,
    })
  }

  const handleSaveDecimo = () => {
    if (calculatedDecimo.length === 0) {
      toast({
        title: "Error",
        description: "Primero debe calcular el décimo tercer mes",
        variant: "destructive",
      })
      return
    }

    calculatedDecimo.forEach(({ employee, calculation }) => {
      const existingDecimo = yearDecimo.find((d) => d.empleadoId === employee.id)

      if (!existingDecimo) {
        addDecimoTercerMes({
          empleadoId: employee.id,
          anio: selectedYear,
          salarioPromedio: calculation.salarioPromedio,
          mesesTrabajados: calculation.mesesTrabajados,
          montoTotal: calculation.montoTotal,
          css: calculation.css,
          cssPatrono: calculation.cssPatrono,
          isr: calculation.isr,
          totalDeducciones: calculation.totalDeducciones,
          totalAportesPatronales: calculation.totalAportesPatronales,
          montoNeto: calculation.montoNeto,
          pagoAbril: calculation.pagoAbril,
          pagoAgosto: calculation.pagoAgosto,
          pagoDiciembre: calculation.pagoDiciembre,
          fechaCalculo: new Date().toISOString(),
          estado: "calculado",
        })
      }
    })

    toast({
      title: "Décimo Tercer Mes guardado",
      description: "Los cálculos han sido guardados exitosamente",
    })
    setCalculatedDecimo([])
  }

  const handleDownloadAllPDFs = () => {
    if (calculatedDecimo.length === 0) {
      toast({
        title: "Error",
        description: "Primero debe calcular el décimo tercer mes",
        variant: "destructive",
      })
      return
    }

    calculatedDecimo.forEach(({ employee, calculation }) => {
      generateDecimoPDF(employee, calculation, selectedYear)
    })

    toast({
      title: "PDFs generados",
      description: `Se han generado ${calculatedDecimo.length} comprobantes`,
    })
  }

  const totalDecimo = calculatedDecimo.reduce((sum, item) => sum + item.calculation.montoNeto, 0)

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card">
        <SidebarNav />
      </aside>
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Décimo Tercer Mes</h1>
          <p className="text-muted-foreground">
            Calcule el décimo tercer mes pagadero en tres partes: Abril, Agosto y Diciembre
          </p>
        </div>

        {activeEmployees.length === 0 && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No hay empleados activos</AlertTitle>
            <AlertDescription>
              Debe agregar empleados activos en la sección de Empleados antes de calcular el décimo tercer mes.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEmployees.length}</div>
              <p className="text-xs text-muted-foreground">Total de empleados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalDecimo.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Sin deducciones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Por Pago</CardTitle>
              <Save className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${(totalDecimo / 3).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Cada cuota</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Configuración del Año</CardTitle>
                <CardDescription>Seleccione el año para calcular el décimo tercer mes</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCalculate} className="gap-2">
                  <Calculator className="h-4 w-4" />
                  Calcular Décimo Tercer Mes
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="year">Año</Label>
                <Input
                  id="year"
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                  min="2000"
                  max="2100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {calculatedDecimo.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resumen del Cálculo</CardTitle>
                  <CardDescription>Décimo tercer mes calculado para el año {selectedYear}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadAllPDFs} variant="outline" className="gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Descargar Todos
                  </Button>
                  <Button onClick={handleSaveDecimo} className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Cálculos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-primary/10 p-6 text-center mb-6">
                <p className="text-sm text-muted-foreground mb-2">Monto Total a Pagar</p>
                <p className="text-4xl font-bold text-primary">
                  ${totalDecimo.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Sin deducciones según ley panameña</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Pago de Abril</p>
                  </div>
                  <p className="text-2xl font-bold">
                    ${(totalDecimo / 3).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">15 de abril</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Pago de Agosto</p>
                  </div>
                  <p className="text-2xl font-bold">
                    ${(totalDecimo / 3).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">15 de agosto</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Pago de Diciembre</p>
                  </div>
                  <p className="text-2xl font-bold">
                    ${(totalDecimo / 3).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">15 de diciembre</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Cálculo por Empleado</CardTitle>
            <CardDescription>
              El décimo tercer mes tiene deducciones de CSS (7.25%) e ISR según el salario anual del empleado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead className="text-right">Salario Promedio</TableHead>
                    <TableHead className="text-center">Meses</TableHead>
                    <TableHead className="text-right">Monto Bruto</TableHead>
                    <TableHead className="text-right">CSS Emp. (7.25%)</TableHead>
                    <TableHead className="text-right">CSS Patr. (10.75%)</TableHead>
                    <TableHead className="text-right">ISR</TableHead>
                    <TableHead className="text-right">Monto Neto</TableHead>
                    <TableHead className="text-right">Por Pago</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground">
                        No hay empleados activos
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeEmployees.map((employee) => {
                      const calculated = calculatedDecimo.find((c) => c.employee.id === employee.id)
                      const saved = yearDecimo.find((d) => d.empleadoId === employee.id)

                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.nombre} {employee.apellido}
                          </TableCell>
                          <TableCell className="font-mono">{employee.cedula}</TableCell>
                          <TableCell className="text-right font-mono">
                            {calculated ? (
                              `$${calculated.calculation.salarioPromedio.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : saved && saved.salarioPromedio !== undefined ? (
                              `$${saved.salarioPromedio.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {calculated ? (
                              <span title={calculated.calculation.mesesDetalle.join(", ")}>
                                {calculated.calculation.mesesTrabajados}
                              </span>
                            ) : saved && saved.mesesTrabajados !== undefined ? (
                              saved.mesesTrabajados
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {calculated ? (
                              `$${calculated.calculation.montoTotal.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : saved && saved.montoTotal !== undefined ? (
                              `$${saved.montoTotal.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                            {calculated ? (
                              `-$${calculated.calculation.css.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : saved && saved.css !== undefined ? (
                              `-$${saved.css.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-600 dark:text-blue-400">
                            {calculated ? (
                              `$${calculated.calculation.cssPatrono.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : saved && saved.cssPatrono !== undefined ? (
                              `$${saved.cssPatrono.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                            {calculated ? (
                              `-$${calculated.calculation.isr.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : saved && saved.isr !== undefined ? (
                              `-$${saved.isr.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">
                            {calculated ? (
                              `$${calculated.calculation.montoNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : saved && saved.montoNeto !== undefined ? (
                              `$${saved.montoNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {calculated ? (
                              `$${(calculated.calculation.montoNeto / 3).toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : saved && saved.montoNeto !== undefined ? (
                              `$${(saved.montoNeto / 3).toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {calculated && (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedEmployee({ employee, calculation: calculated.calculation })}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Descargar Comprobantes</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => generateDecimoPDF(employee, calculated.calculation, selectedYear)}
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Comprobante Completo
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        generateDecimoPaymentVoucher(
                                          employee,
                                          calculated.calculation,
                                          selectedYear,
                                          "abril",
                                        )
                                      }
                                    >
                                      Voucher Abril
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        generateDecimoPaymentVoucher(
                                          employee,
                                          calculated.calculation,
                                          selectedYear,
                                          "agosto",
                                        )
                                      }
                                    >
                                      Voucher Agosto
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        generateDecimoPaymentVoucher(
                                          employee,
                                          calculated.calculation,
                                          selectedYear,
                                          "diciembre",
                                        )
                                      }
                                    >
                                      Voucher Diciembre
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 rounded-lg bg-muted p-4">
              <h4 className="font-semibold mb-2">Información sobre el Décimo Tercer Mes en Panamá</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • <strong>Fórmula: Ingresos Totales × 4/12</strong>
                </li>
                <li>• Se paga en TRES partes iguales: 15 de abril, 15 de agosto, 15 de diciembre</li>
                <li>
                  • <strong>Deducciones empleado:</strong> CSS (7.25%) e ISR según salario anual
                </li>
                <li>
                  • <strong>Aporte patronal:</strong> CSS (10.75%) sobre el monto del décimo
                </li>
                <li>• El ISR se calcula sobre el ingreso anual total incluyendo el décimo</li>
                <li>• Cada pago representa 1/3 del monto neto después de deducciones</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detalle de Décimo Tercer Mes - {selectedEmployee?.employee.nombre} {selectedEmployee?.employee.apellido}
            </DialogTitle>
            <DialogDescription>Desglose completo de cálculo con deducciones</DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Información del Cálculo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Salario Promedio</p>
                    <p className="text-lg font-semibold">
                      $
                      {selectedEmployee.calculation.salarioPromedio.toLocaleString("es-PA", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Meses Trabajados</p>
                    <p className="text-lg font-semibold">{selectedEmployee.calculation.mesesTrabajados}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedEmployee.calculation.mesesDetalle.join(", ")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Fórmula aplicada:</p>
                  <p className="text-sm font-mono text-blue-900 dark:text-blue-100">
                    $
                    {(
                      selectedEmployee.calculation.salarioPromedio * selectedEmployee.calculation.mesesTrabajados
                    ).toLocaleString("es-PA", { minimumFractionDigits: 2 })}{" "}
                    × 4/12 = $
                    {selectedEmployee.calculation.montoTotal.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Deducciones y Aportes</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Monto Bruto</span>
                    <span className="font-mono font-semibold">
                      ${selectedEmployee.calculation.montoTotal.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                    <span className="text-sm">CSS Empleado (7.25%)</span>
                    <span className="font-mono">
                      -${selectedEmployee.calculation.css.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                    <span className="text-sm">CSS Patrono (10.75%)</span>
                    <span className="font-mono">
                      ${selectedEmployee.calculation.cssPatrono.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                    <span className="text-sm">ISR</span>
                    <span className="font-mono">
                      -${selectedEmployee.calculation.isr.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Deducciones Empleado</span>
                    <span className="font-mono text-red-600 dark:text-red-400">
                      -$
                      {selectedEmployee.calculation.totalDeducciones.toLocaleString("es-PA", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Aportes Patronales</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      $
                      {selectedEmployee.calculation.totalAportesPatronales.toLocaleString("es-PA", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Monto Neto a Pagar</h3>
                <div className="rounded-lg bg-primary/10 p-4 mb-4">
                  <p className="text-3xl font-bold text-primary">
                    ${selectedEmployee.calculation.montoNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Después de deducciones</p>
                </div>

                <h4 className="font-semibold mb-3 text-sm">Pagos Programados (3 cuotas iguales)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-1">15 Abril</p>
                    <p className="font-bold">
                      ${selectedEmployee.calculation.pagoAbril.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-1">15 Agosto</p>
                    <p className="font-bold">
                      ${selectedEmployee.calculation.pagoAgosto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-1">15 Diciembre</p>
                    <p className="font-bold">
                      $
                      {selectedEmployee.calculation.pagoDiciembre.toLocaleString("es-PA", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    generateDecimoPDF(selectedEmployee.employee, selectedEmployee.calculation, selectedYear)
                  }
                  className="flex-1 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Comprobante Completo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
