"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Employee } from "@/lib/types"
import type { calculatePayroll } from "@/lib/payroll-calculations"

interface DeductionsBreakdownProps {
  employee: Employee
  calculation: ReturnType<typeof calculatePayroll>
  showPercentages?: boolean
  compact?: boolean
}

export function DeductionsBreakdown({
  employee,
  calculation,
  showPercentages = true,
  compact = false,
}: DeductionsBreakdownProps) {
  const legalDeductions = [
    {
      name: "Seguro Social (CSS)",
      amount: calculation.seguroSocialEmpleado,
      percentage: 9.75,
      color: "bg-blue-500",
    },
    {
      name: "Seguro Educativo",
      amount: calculation.seguroEducativo,
      percentage: 1.25,
      color: "bg-green-500",
    },
    {
      name: "Impuesto sobre la Renta (ISR)",
      amount: calculation.isr,
      percentage: (calculation.isr / calculation.salarioBruto) * 100,
      color: "bg-orange-500",
    },
    {
      name: "Otras Retenciones",
      amount: calculation.otrasRetenciones,
      percentage: (calculation.otrasRetenciones / calculation.salarioBruto) * 100,
      color: "bg-purple-500",
    },
  ].filter((d) => d.amount > 0)

  const personalDeductions = []

  if (calculation.deduccionesBancarias > 0) {
    personalDeductions.push({
      name: "Deducciones Bancarias",
      amount: calculation.deduccionesBancarias,
      percentage: (calculation.deduccionesBancarias / calculation.salarioBruto) * 100,
      color: "bg-red-500",
    })
  }

  if (employee.prestamos && employee.prestamos > 0) {
    personalDeductions.push({
      name: "Préstamos",
      amount: employee.prestamos,
      percentage: (employee.prestamos / calculation.salarioBruto) * 100,
      color: "bg-pink-500",
    })
  }

  if (calculation.otrasDeduccionesPersonalizadas > 0) {
    personalDeductions.push({
      name: "Otras Deducciones",
      amount: calculation.otrasDeduccionesPersonalizadas,
      percentage: (calculation.otrasDeduccionesPersonalizadas / calculation.salarioBruto) * 100,
      color: "bg-indigo-500",
    })
  }

  const totalLegalDeductions = legalDeductions.reduce((sum, d) => sum + d.amount, 0)
  const totalPersonalDeductions = personalDeductions.reduce((sum, d) => sum + d.amount, 0)
  const totalDeductions = calculation.totalDeducciones
  const deductionPercentage = (totalDeductions / calculation.salarioBruto) * 100

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Deducciones</span>
          <div className="text-right">
            <p className="text-sm font-bold text-destructive">
              ${totalDeductions.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
            </p>
            {showPercentages && (
              <p className="text-xs text-muted-foreground">{deductionPercentage.toFixed(2)}% del salario bruto</p>
            )}
          </div>
        </div>
        <Progress value={deductionPercentage} className="h-2" />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Legales</p>
            <p className="font-semibold">
              ${totalLegalDeductions.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
            </p>
          </div>
          {totalPersonalDeductions > 0 && (
            <div>
              <p className="text-muted-foreground">Personales</p>
              <p className="font-semibold">
                ${totalPersonalDeductions.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglose de Deducciones</CardTitle>
        <CardDescription>
          Análisis detallado de todas las deducciones aplicadas al salario de {employee.nombre} {employee.apellido}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Total Deducciones</span>
            <div className="text-right">
              <p className="text-xl font-bold text-destructive">
                ${totalDeductions.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </p>
              {showPercentages && (
                <p className="text-xs text-muted-foreground">{deductionPercentage.toFixed(2)}% del salario bruto</p>
              )}
            </div>
          </div>
          <Progress value={deductionPercentage} className="h-2" />
        </div>

        {/* Legal Deductions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Deducciones Legales</h4>
            <span className="text-sm font-mono">
              ${totalLegalDeductions.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="space-y-3">
            {legalDeductions.map((deduction, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{deduction.name}</span>
                  <div className="text-right">
                    <span className="font-mono">
                      ${deduction.amount.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                    {showPercentages && (
                      <span className="ml-2 text-xs text-muted-foreground">({deduction.percentage.toFixed(2)}%)</span>
                    )}
                  </div>
                </div>
                <Progress value={(deduction.amount / totalDeductions) * 100} className={`h-1.5 ${deduction.color}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Personal Deductions */}
        {personalDeductions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Deducciones Personales</h4>
              <span className="text-sm font-mono">
                ${totalPersonalDeductions.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="space-y-3">
              {personalDeductions.map((deduction, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{deduction.name}</span>
                    <div className="text-right">
                      <span className="font-mono">
                        ${deduction.amount.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </span>
                      {showPercentages && (
                        <span className="ml-2 text-xs text-muted-foreground">({deduction.percentage.toFixed(2)}%)</span>
                      )}
                    </div>
                  </div>
                  <Progress value={(deduction.amount / totalDeductions) * 100} className={`h-1.5 ${deduction.color}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Deductions Detail */}
        {employee.otrasDeduccionesPersonalizadas && employee.otrasDeduccionesPersonalizadas.length > 0 && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="font-semibold mb-3 text-sm">Detalle de Deducciones Personalizadas</h4>
            <div className="space-y-2">
              {employee.otrasDeduccionesPersonalizadas
                .filter((d) => d.activo)
                .map((deduction) => {
                  const amount =
                    deduction.tipo === "fijo" ? deduction.monto : (employee.salarioBase * deduction.monto) / 100
                  return (
                    <div key={deduction.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{deduction.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {deduction.tipo === "fijo" ? "Monto fijo" : `${deduction.monto}% del salario base`}
                        </p>
                      </div>
                      <span className="font-mono text-sm">
                        ${amount.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Comparison */}
        <div className="rounded-lg bg-muted p-4">
          <h4 className="font-semibold mb-3 text-sm">Comparación</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Salario Bruto</span>
              <span className="font-mono">
                ${calculation.salarioBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-destructive">
              <span>Total Deducciones</span>
              <span className="font-mono">
                -${totalDeductions.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-bold">
              <span>Salario Neto</span>
              <span className="font-mono text-primary">
                ${calculation.salarioNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Porcentaje retenido</span>
              <span>{deductionPercentage.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Porcentaje neto</span>
              <span>{(100 - deductionPercentage).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
