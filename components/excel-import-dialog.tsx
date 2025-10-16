"use client"

import type React from "react"

import { useState } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import * as XLSX from "xlsx"

interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function ExcelImportDialog({ open, onOpenChange }: ExcelImportDialogProps) {
  const { addEmployee, currentCompanyId } = usePayroll()
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState(0)

  const downloadTemplate = () => {
    const template = [
      ["cedula", "nombre", "apellido", "salario", "departamento", "cargo"],
      ["8-123-4567", "Juan", "Pérez", "1500", "Ventas", "Vendedor"],
      ["8-234-5678", "María", "González", "2000", "Administración", "Contador"],
    ]

    const ws = XLSX.utils.aoa_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Empleados")

    // Generate file data as array buffer
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })

    // Create blob and download link
    const blob = new Blob([wbout], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "plantilla_empleados.xlsx"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!currentCompanyId) {
      setResult({
        success: 0,
        failed: 0,
        errors: ["Debe seleccionar una empresa primero"],
      })
      return
    }

    setImporting(true)
    setProgress(0)
    setResult(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const errors: string[] = []
      let success = 0
      let failed = 0

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        setProgress(((i + 1) / jsonData.length) * 100)

        try {
          // Validate required fields
          if (!row.cedula || !row.nombre || !row.salario) {
            errors.push(`Fila ${i + 2}: Faltan campos requeridos (cédula, nombre, salario)`)
            failed++
            continue
          }

          // Parse salary
          const salario = Number.parseFloat(String(row.salario).replace(/[^0-9.-]/g, ""))
          if (Number.isNaN(salario) || salario <= 0) {
            errors.push(`Fila ${i + 2}: Salario inválido (${row.salario})`)
            failed++
            continue
          }

          // Create employee
          const newEmployee = {
            companiaId: currentCompanyId,
            cedula: String(row.cedula).trim(),
            nombre: String(row.nombre).trim(),
            apellido: row.apellido ? String(row.apellido).trim() : "",
            fechaIngreso: new Date().toISOString().split("T")[0],
            salarioBase: salario,
            departamento: row.departamento ? String(row.departamento).trim() : "General",
            cargo: row.cargo ? String(row.cargo).trim() : "Empleado",
            estado: "activo" as const,
          }

          addEmployee(newEmployee)
          success++
        } catch (error) {
          errors.push(`Fila ${i + 2}: Error al procesar - ${error}`)
          failed++
        }
      }

      setResult({ success, failed, errors })
    } catch (error) {
      setResult({
        success: 0,
        failed: 0,
        errors: [`Error al leer el archivo: ${error}`],
      })
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  const handleClose = () => {
    setResult(null)
    setProgress(0)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Empleados desde Excel</DialogTitle>
          <DialogDescription>
            Suba un archivo Excel con la información de los empleados. Descargue la plantilla para ver el formato
            correcto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
            <div>
              <p className="font-medium">Plantilla de Excel</p>
              <p className="text-sm text-muted-foreground">Descargue la plantilla con el formato correcto</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Descargar Plantilla
            </Button>
          </div>

          {/* Upload Section */}
          <div className="space-y-2">
            <label
              htmlFor="excel-upload"
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 transition-colors hover:bg-muted"
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Haga clic para seleccionar un archivo</p>
              <p className="text-xs text-muted-foreground">o arrastre y suelte aquí</p>
              <p className="mt-2 text-xs text-muted-foreground">Formatos: .xlsx, .xls</p>
            </label>
            <input
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={importing}
              className="hidden"
            />
          </div>

          {/* Progress Bar */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando empleados...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {result.success > 0 && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    {result.success} empleado{result.success !== 1 ? "s" : ""} importado
                    {result.success !== 1 ? "s" : ""} exitosamente
                  </AlertDescription>
                </Alert>
              )}

              {result.failed > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.failed} empleado{result.failed !== 1 ? "s" : ""} no se pudo
                    {result.failed !== 1 ? "ieron" : ""} importar
                  </AlertDescription>
                </Alert>
              )}

              {result.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="mb-2 font-medium">Errores encontrados:</p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                      {result.errors.map((error, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium">Formato del archivo:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                • <strong>cedula</strong>: Número de cédula del empleado (requerido)
              </li>
              <li>
                • <strong>nombre</strong>: Nombre del empleado (requerido)
              </li>
              <li>
                • <strong>apellido</strong>: Apellido del empleado (opcional)
              </li>
              <li>
                • <strong>salario</strong>: Salario base mensual (requerido)
              </li>
              <li>
                • <strong>departamento</strong>: Departamento (opcional, por defecto: General)
              </li>
              <li>
                • <strong>cargo</strong>: Cargo o puesto (opcional, por defecto: Empleado)
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
