"use client"

import type React from "react"
import { useState } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {Download, CheckCircle2, XCircle, AlertCircle, FileInput } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import * as XLSX from "xlsx"
import { toast } from "./ui/use-toast"
import { Spinner } from "./ui/spinner"
import { importEmployeesFromSheet } from "@/lib/import-utils"

interface ExcelImportDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function ExcelImportDialog({ isOpen, setIsOpen }: ExcelImportDialogProps) {
  const { currentCompany, fetchCompanyData } = usePayroll()
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState(0)

  const downloadTemplate = () => {
    const templateHeaders = [
      "cedula", "nombre", "apellido", "fechaIngreso", "salarioBase", "departamento", "cargo", "email", "telefono", "direccion"
    ];
    
    const templateData = [
        ["8-800-800", "Juan", "Pérez", "2024-01-15", 2500, "Ingeniería", "Desarrollador", "juan.perez@test.com", "6600-1100", "Ciudad de Panamá"],
        ["9-123-456", "Maria", "Gómez", "2023-05-01", 1200, "Ventas", "Ejecutivo", "maria.gomez@test.com", "", "Chiriquí"],
    ];

    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, ...templateData])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Empleados")

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
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
    // FIX: Prevenir el comportamiento por defecto del navegador (que puede ser la recarga)
    e.preventDefault(); 
    
    const file = e.target.files?.[0]
    if (!file) return

    if (!currentCompany?.id) {
      toast({
        title: "Error de Importación",
        description: "Debe seleccionar una empresa activa primero.",
        variant: "destructive",
      })
      e.target.value = ""
      return
    }

    setImporting(true)
    setProgress(0)
    setResult(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      
      // Convertir a JSON con encabezados en minúsculas (sin headers mapeados, los mapeamos después)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

      // Usar la función de utilidad para procesar y enviar al servidor
      const importResponse = await importEmployeesFromSheet(jsonData, currentCompany.id, setProgress);

      setResult({ 
        success: importResponse.successfulImports.length, 
        failed: importResponse.failedImports.length, 
        errors: importResponse.failedImports.map(f => `Fila ${f.rowNumber}: ${f.error}`),
      })
      
      // Si tuvo éxito, recargar los datos del contexto
      if (importResponse.successfulImports.length > 0) {
          await fetchCompanyData(currentCompany.id);
      }

    } catch (error: any) {
      setResult({
        success: 0,
        failed: 0,
        errors: [`Error al leer el archivo: ${error.message || String(error)}`],
      })
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  const handleClose = () => {
    setResult(null)
    setProgress(0)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Empleados desde Excel</DialogTitle>
          <DialogDescription>
            Suba un archivo Excel con la información de los empleados. La importación validará los campos y actualizará
            los registros existentes por cédula.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
            <div>
              <p className="font-medium">Plantilla de Excel</p>
              <p className="text-sm text-muted-foreground">Descargue la plantilla con el formato requerido.</p>
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
              {importing ? (
                <Spinner className="mb-2 h-8 w-8 text-primary" />
              ) : (
                <FileInput className="mb-2 h-8 w-8 text-muted-foreground" />
              )}
              
              <p className="text-sm font-medium">Haga clic para seleccionar el archivo</p>
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
                <span>Procesando...</span>
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
                <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription>
                    <p className="mb-2 font-medium">Errores encontrados ({result.errors.length}):</p>
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
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={handleClose}>Cerrar</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
