"use client"

import { useState, useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator, Receipt, DollarSign, AlertCircle, TrendingUp, Download } from "lucide-react"
import type { Employee } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { generateISRPDF } from "@/lib/isr-pdf-generator"

interface ISRCalculation {
  employee: Employee
  salarioMensual: number
  salarioAnual: number
  montoExento: number
  baseImponible: number
  isrAnual: number
  isrMensual: number
  tasaAplicada: string
}

export default function ImpuestoSobreRentaPage() {
  const { employees } = usePayroll()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [calculations, setCalculations] = useState<ISRCalculation[]>([])

  const activeEmployees = employees.filter((e) => e.estado === "activo")

  const calculateISR = (salarioAnual: number): { isr: number; tasa: string } => {
    let isr = 0
    let tasa = "0%"

    if (salarioAnual <= 11000) {
      // Exento
      isr = 0
      tasa = "0% (Exento)"
    } else if (salarioAnual <= 50000) {
      // 15% sobre el excedente de $11,000
      isr = ((salarioAnual - 11000) * 15) / 100
      tasa = "15%"
    } else {
      // 15% sobre los primeros $39,000 + 25% sobre el excedente de $50,000
      isr = 5850 + ((salarioAnual - 50000) * 25) / 100
      tasa = "15% + 25%"
    }

    return { isr, tasa }
  }

  const handleCalculate = () => {
    console.log("[v0] Calculating ISR for year:", selectedYear)
    console.log("[v0] Active employees:", activeEmployees.length)

    const results: ISRCalculation[] = activeEmployees.map((employee) => {
      const salarioMensual = employee.salarioBase
      const salarioAnual = salarioMensual * 13
      const montoExento = 11000
      const baseImponible = Math.max(0, salarioAnual - montoExento)
      const { isr: isrAnual, tasa } = calculateISR(salarioAnual)
      const isrMensual = isrAnual / 13

      console.log("[v0] ========================================")
      console.log("[v0] Empleado:", employee.nombre, employee.apellido)
      console.log("[v0] Salario mensual: $", salarioMensual.toFixed(2))
      console.log("[v0] Salario anual: $", salarioAnual.toFixed(2))
      console.log("[v0] Monto exento: $", montoExento.toFixed(2))
      console.log("[v0] ISR anual: $", isrAnual.toFixed(2))
      console.log("[v0] ISR mensual: $", isrMensual.toFixed(2))
      console.log("[v0] Tasa aplicada:", tasa)
      console.log("[v0] ========================================")

      return {
        employee,
        salarioMensual,
        salarioAnual,
        montoExento,
        baseImponible,
        isrAnual,
        isrMensual,
        tasaAplicada: tasa,
      }
    })

    setCalculations(results)
  }

  useEffect(() => {
    if (activeEmployees.length > 0) {
      handleCalculate()
    }
  }, [activeEmployees.length])

  const totalISRAnual = calculations.reduce((sum, calc) => sum + calc.isrAnual, 0)
  const totalISRMensual = calculations.reduce((sum, calc) => sum + calc.isrMensual, 0)
  const totalSalarioAnual = calculations.reduce((sum, calc) => sum + calc.salarioAnual, 0)
  const empleadosConISR = calculations.filter((calc) => calc.isrAnual > 0).length

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Impuesto Sobre la Renta (ISR)</h1>
          <p className="text-muted-foreground">Cálculo del ISR mensual y anual según los tramos fiscales de Panamá</p>
        </div>

        {activeEmployees.length === 0 && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No hay empleados activos</AlertTitle>
            <AlertDescription>
              Debe agregar empleados activos en la sección de Empleados antes de calcular el ISR.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-4 mb-6">
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
              <CardTitle className="text-sm font-medium">Empleados con ISR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{empleadosConISR}</div>
              <p className="text-xs text-muted-foreground">Salario anual &gt; $11,000</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ISR Mensual Total</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ${totalISRMensual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Deducción mensual</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ISR Anual Total</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ${totalISRAnual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Total del año</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuración del Año</CardTitle>
            <CardDescription>Seleccione el año para calcular el ISR</CardDescription>
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
              <Button onClick={handleCalculate} className="gap-2">
                <Calculator className="h-4 w-4" />
                Calcular ISR
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tramos Fiscales del ISR en Panamá</CardTitle>
            <CardDescription>Tasas impositivas vigentes según el nivel de ingresos anuales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4 bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <p className="text-sm font-semibold">Tramo 1: Exento</p>
                </div>
                <p className="text-lg font-bold mb-1">0%</p>
                <p className="text-xs text-muted-foreground">Ingresos anuales menores a $11,000</p>
              </div>
              <div className="rounded-lg border border-border p-4 bg-yellow-50 dark:bg-yellow-950">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <p className="text-sm font-semibold">Tramo 2: Medio</p>
                </div>
                <p className="text-lg font-bold mb-1">15%</p>
                <p className="text-xs text-muted-foreground">Sobre el excedente de $11,000 hasta $50,000</p>
              </div>
              <div className="rounded-lg border border-border p-4 bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <p className="text-sm font-semibold">Tramo 3: Alto</p>
                </div>
                <p className="text-lg font-bold mb-1">25%</p>
                <p className="text-xs text-muted-foreground">Sobre el excedente de $50,000</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cálculo de ISR por Empleado</CardTitle>
            <CardDescription>Desglose detallado del impuesto sobre la renta para cada empleado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead className="text-right">Salario Mensual</TableHead>
                    <TableHead className="text-right">Salario Anual</TableHead>
                    <TableHead className="text-center">Tasa</TableHead>
                    <TableHead className="text-right">ISR Anual</TableHead>
                    <TableHead className="text-right">ISR Mensual</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No hay cálculos disponibles. Haga clic en "Calcular ISR"
                      </TableCell>
                    </TableRow>
                  ) : (
                    calculations.map((calc) => (
                      <TableRow key={calc.employee.id}>
                        <TableCell className="font-medium">
                          {calc.employee.nombre} {calc.employee.apellido}
                        </TableCell>
                        <TableCell className="font-mono">{calc.employee.cedula}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${calc.salarioMensual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${calc.salarioAnual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              calc.isrAnual === 0
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : calc.salarioAnual <= 50000
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            }`}
                          >
                            {calc.tasaAplicada}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive font-semibold">
                          ${calc.isrAnual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive font-bold">
                          ${calc.isrMensual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateISRPDF(calc, selectedYear, "Mi Empresa")}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 rounded-lg bg-muted p-4">
              <h4 className="font-semibold mb-2">Ejemplo de Cálculo del ISR</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Caso:</strong> Un trabajador con salario mensual de $3,000
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Salario anual (incluyendo décimo): $3,000 × 13 = $39,000</li>
                  <li>Se resta el umbral exento: $39,000 - $11,000 = $28,000</li>
                  <li>Se aplica el 15% sobre el excedente: $28,000 × 15% = $4,200</li>
                  <li>ISR anual: $4,200</li>
                  <li>ISR mensual: $4,200 ÷ 13 = $323.08</li>
                </ol>
                <p className="mt-3 text-xs">
                  <strong>Nota:</strong> El salario anual incluye los 13 meses (12 meses regulares + décimo tercer mes).
                  El ISR anual se divide entre 13 pagos para distribuir la carga fiscal proporcionalmente durante todo
                  el año.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
