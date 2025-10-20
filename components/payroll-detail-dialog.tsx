"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import type { Employee } from "@/lib/types"
import type { calculatePayroll } from "@/lib/payroll-calculations"
import { generatePayrollPDF } from "@/lib/pdf-generator"
import { usePayroll } from "@/lib/payroll-context"

interface PayrollDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee
  calculation: ReturnType<typeof calculatePayroll>
  periodo: string
}

export function PayrollDetailDialog({ open, onOpenChange, employee, calculation, periodo }: PayrollDetailDialogProps) {
  // Solo necesitamos currentCompany. companies ya no es necesario aquí.
  const { currentCompany } = usePayroll() 

  // CORRECCIÓN: Usar el objeto currentCompany directamente.
  // Si currentCompany es null, companyName será undefined.
  const companyName = currentCompany?.nombre 

  const handleDownloadPDF = () => {
    // Pasar companyName (string | undefined) a la función PDF
    generatePayrollPDF(employee, calculation, periodo, companyName)
  }

  // --- El resto del JSX permanece igual ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalle de Planilla - {employee?.nombre} {employee?.apellido}
          </DialogTitle>
          <DialogDescription>Período: {periodo}</DialogDescription>
        </DialogHeader>

        {/* ... (El resto del contenido del Dialog) ... */}

        <div className="space-y-6">
          {/* Employee Information */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Información del Empleado</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cédula</p>
                <p className="font-medium">{employee?.cedula}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Departamento</p>
                <p className="font-medium">{employee?.departamento}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cargo</p>
                <p className="font-medium">{employee?.cargo}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Salario Base</p>
                <p className="font-medium font-mono">
                  ${employee?.salarioBase.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Payroll Breakdown */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Salario Bruto</TableCell>
                  <TableCell className="text-right font-mono">
                    ${calculation?.salarioBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={2} className="font-semibold bg-muted/50">
                    Deducciones Legales
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Seguro Social Empleado (9.75%)</TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    -${calculation?.seguroSocialEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Seguro Educativo (1.25%)</TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    -${calculation?.seguroEducativo.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">ISR</TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    -${calculation?.isr?.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>

                {(calculation?.deduccionesBancarias > 0 ||
                  calculation?.prestamos > 0 ||
                  calculation?.otrasDeduccionesPersonalizadas > 0) && (
                    <>
                      <TableRow>
                        <TableCell colSpan={2} className="font-semibold bg-muted/50">
                          Deducciones Personales
                        </TableCell>
                      </TableRow>
                      {calculation.deduccionesBancarias > 0 && (
                        <TableRow>
                          <TableCell className="pl-8">Deducciones Bancarias</TableCell>
                          <TableCell className="text-right font-mono text-destructive">
                            -${calculation.deduccionesBancarias.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      )}
                      {calculation?.prestamos > 0 && (
                        <TableRow>
                          <TableCell className="pl-8">Préstamos</TableCell>
                          <TableCell className="text-right font-mono text-destructive">
                            -${calculation?.prestamos.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      )}
                      {calculation?.otrasDeduccionesPersonalizadas > 0 && (
                        <TableRow>
                          <TableCell className="pl-8">Otras Deducciones</TableCell>
                          <TableCell className="text-right font-mono text-destructive">
                            -$
                            {calculation?.otrasDeduccionesPersonalizadas.toLocaleString("es-PA", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}

                <TableRow>
                  <TableCell className="font-medium">Total Deducciones</TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    -${calculation?.totalDeducciones.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-primary/5">
                  <TableCell className="font-bold">Salario Neto</TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary text-lg">
                    ${calculation?.salarioNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Employer Costs */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <h3 className="font-semibold mb-3">Costos Patronales</h3>
            <p className="text-sm text-muted-foreground mb-3">Estos costos no se deducen del salario del empleado</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Seguro Social Empleador (13.25%)</span>
                <span className="font-mono">
                  ${calculation?.seguroSocialEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Seguro Educativo Empleador (1.5%)</span>
                <span className="font-mono">
                  ${calculation?.seguroEducativoEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Riesgo Profesional (0.98%)</span>
                <span className="font-mono">
                  ${calculation?.riesgoProfesional.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total Costo Patronal</span>
                <span className="font-mono">
                  $
                  {(
                    calculation?.seguroSocialEmpleador +
                    calculation?.seguroEducativoEmpleador +
                    calculation?.riesgoProfesional
                  ).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold">
                <span>Costo Total para la Empresa</span>
                <span className="font-mono text-lg">
                  $
                  {(
                    calculation?.salarioBruto +
                    calculation?.seguroSocialEmpleador +
                    calculation?.seguroEducativoEmpleador +
                    calculation?.riesgoProfesional
                  ).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div className="flex justify-end">
            <Button onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}