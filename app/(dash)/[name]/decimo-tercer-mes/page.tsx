// File: app/decimo-tercer-mes/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { usePayroll } from "@/lib/payroll-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { DecimoTercerMes, Employee } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Check,
  Loader2,
  Save,
  Trash2,
  Calculator,
  DollarSign,
  Eye,
  Download,
  FileText,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { MonthSelector } from "@/components/month-selector";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ca, se } from "date-fns/locale";

// Interfaz para el cálculo temporal (le añadimos el nombre y la cédula para la tabla)
interface CalculatedDecimo extends DecimoTercerMes {
  employeeName: string;
}

export default function DecimoTercerMesPage() {
  const {
    currentCompany,
    employees: employeesContext,
    decimoEntries: decimoEntriesContext,
    saveDecimoEntries,
    deleteYearDecimo,
    currentYear,
    selectYear,
    calculateDecimoApi,
    isLoading,
  } = usePayroll();

  // Fallback para arrays del contexto
  const employees = employeesContext || [];
  const decimoEntries = decimoEntriesContext || [];
  const [calculatedDecimos, setCalculatedDecimos] = useState<CalculatedDecimo[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<CalculatedDecimo | null>(null);
  // Se usa currentYear del contexto para filtrar y en el useEffect
  const entriesForCurrentYear = useMemo(
    () => decimoEntries.filter((e) => e.anio === currentYear),
    [decimoEntries, currentYear]
  );
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.estado === "activo"),
    [employees]
  );
  const isYearClosed =
    entriesForCurrentYear.length > 0 &&
    entriesForCurrentYear.every((e) => e.estado === "pagado_completo");

  // Obtenemos el número del mes actual para el MonthSelector (si se usara)
  const currentMonthNumber = new Date().getMonth() + 1;

  // --- KPIs Calculations ---
  const totalDecimoNeto = useMemo(
    () => calculatedDecimos.reduce((sum, item) => sum + item.montoNeto, 0),
    [calculatedDecimos]
  );
  console.log('Total Décimo Neto:', totalDecimoNeto);
  const totalDecimoBruto = useMemo(
    () => calculatedDecimos.reduce((sum, item) => sum + item.montoTotal, 0),
    [calculatedDecimos]
  );
  console.log('Total Décimo Bruto:', totalDecimoBruto);
  // Efecto para sincronizar los cálculos con las entradas existentes
  useEffect(() => {
    if (entriesForCurrentYear.length > 0) {
      const syncedData: CalculatedDecimo[] = entriesForCurrentYear
        .map((e) => {
          const employee = employees.find((emp) => emp.id === e.empleadoId);

          return {
            ...e,
            salarioPromedio: e.salarioPromedio ?? 0,
            montoTotal: e.montoTotal ?? 0,
            css: e.css ?? 0,
            cssPatrono: e.cssPatrono ?? 0,
            isr: e.isr ?? 0,
            totalDeducciones: e.totalDeducciones ?? 0,
            totalAportesPatronales: e.totalAportesPatronales ?? 0,
            montoNeto: e.montoNeto ?? 0,
            pagoAbril: e.pagoAbril ?? 0,
            pagoAgosto: e.pagoAgosto ?? 0,
            pagoDiciembre: e.pagoDiciembre ?? 0,

            employeeName: employee
              ? `${employee.nombre} ${employee.apellido}`
              : "Empleado Desconocido",
          };
        })
        .filter((e) => e.employeeName !== "Empleado Desconocido");
      setCalculatedDecimos(syncedData);
    } else {
      setCalculatedDecimos([]);
    }
  }, [entriesForCurrentYear, employees]);

  const handleCalculateDecimo = async () => {
    if (!currentCompany || activeEmployees.length === 0) {
      toast({
        title: "Advertencia",
        description: "No hay empleados activos o compañía seleccionada.",
        variant: "default",
      });
      return;
    }
    setIsCalculating(true);
    const newCalculations: CalculatedDecimo[] = [];
    try {
      for (const employee of activeEmployees) {
        const result = await calculateDecimoApi(
          String(employee.id),
          String(currentCompany.id),
          Number(currentYear)
        );
        const decimoEntry: CalculatedDecimo = {
          ...result,
          employeeName: `${employee.nombre} ${employee.apellido}`,
          companiaId: String(currentCompany.id),
          empleadoId: String(employee.id),
          anio: currentYear,
          fechaCalculo: new Date().toISOString(),
          estado: "calculado",
        };
        newCalculations.push(decimoEntry);
      }
      setCalculatedDecimos(newCalculations);
      toast({
        title: "Cálculo Completo",
        description: `Se calcularon ${newCalculations.length} décimos para el año ${currentYear}.`,
        variant: "default",
      });
    } catch (e) {
      console.error("Error calculating décimo:", e);
      toast({
        title: "Error",
        description:
          "Fallo el cálculo del Décimo Tercer Mes. Verifique la consola.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveDecimo = async (
    estado: "pagado_parcial" | "pagado_completo"
  ) => {
    if (calculatedDecimos.length === 0 || !currentCompany) return;

    setIsSaving(true);
    try {
      const entriesToSave: DecimoTercerMes[] = calculatedDecimos.map((calc) => {
        const { employeeName, ...rest } = calc;
        return {
          ...rest,
          estado: estado,
          id:
            entriesForCurrentYear.find((e) => e.empleadoId === calc.empleadoId)
              ?.id || `temp-${calc.empleadoId}`,
        };
      });

      await saveDecimoEntries(entriesToSave);

      toast({
        title: "Guardado Exitoso",
        description: `El Décimo se guardó como ${estado}.`,
        variant: "default",
      });
    } catch (e) {
      console.error("Error saving décimo:", e);
      toast({
        title: "Error al Guardar",
        description: "Fallo al guardar el décimo. Revise la consola.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDecimo = async () => {
    if (entriesForCurrentYear.length === 0) return;
    try {
      await deleteYearDecimo(currentYear);
      setCalculatedDecimos([]);
      toast({
        title: "Cálculo Eliminado",
        description: `El cálculo del décimo para el año ${currentYear} fue eliminado.`,
        variant: "default",
      });
    } catch (e) {
      console.error("Error clearing décimo:", e);
      toast({
        title: "Error al Eliminar",
        description: "Fallo al limpiar el décimo. Revise la consola.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDFs = (
    type: "all" | "voucher_abr" | "voucher_ago" | "voucher_dic" | "full_pdf",
    decimo?: CalculatedDecimo
  ) => {
    if (calculatedDecimos.length === 0) {
      toast({
        title: "Error",
        description: "Primero debe calcular el décimo tercer mes",
        variant: "destructive",
      });
      return;
    }

    let message = "";
    if (type === "all") {
      message = `Se ha solicitado la descarga de ${calculatedDecimos.length} comprobantes (Función simulada).`;
    } else if (decimo) {
      message = `Descargando ${type.replace("_", " ")} para ${
        decimo.employeeName
      } (Función simulada).`;
    } else {
      message = "Descarga de comprobantes (Función simulada).";
    }

    toast({
      title: "Descarga Solicitada",
      description: message,
      variant: "default",
    });
  };

  if (!currentCompany) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-muted-foreground">
          Por favor, seleccione una compañía para calcular el Décimo Tercer Mes.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Décimo Tercer Mes
        </h1>
        <p className="text-muted-foreground">
          Calcule el décimo tercer mes pagadero en tres partes: Abril, Agosto y
          Diciembre
        </p>
      </div>

      {/* ALERTA DE EMPLEADOS (Coincide con la imagen) */}
      {activeEmployees.length === 0 && (
        <Alert variant="default" className="mb-6 border border-border">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay empleados activos</AlertTitle>
          <AlertDescription>
            Debe agregar empleados activos en la sección de Empleados antes de
            calcular el décimo tercer mes.
          </AlertDescription>
        </Alert>
      )}

      {/* --- KPI CARDS (Coincide con la imagen) --- */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Empleados Activos
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees.length}</div>
            <p className="text-xs text-muted-foreground">Total de empleados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Monto Total Bruto
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDecimoBruto)}
            </div>
            <p className="text-xs text-muted-foreground">Sin deducciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Monto Neto por Pago
            </CardTitle>
            <Save className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {/* Mostrar el total del monto neto dividido entre 3 */}
              {formatCurrency(totalDecimoNeto / 3)}
            </div>
            <p className="text-xs text-muted-foreground">Cada cuota</p>
          </CardContent>
        </Card>
      </div>

      {/* --- CONFIGURACIÓN DEL AÑO Y CÁLCULO --- */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuración del Año</CardTitle>
              <CardDescription>
                Seleccione el año para calcular el décimo tercer mes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCalculateDecimo}
                className="gap-2"
                disabled={
                  isCalculating ||
                  !currentCompany ||
                  activeEmployees.length === 0 ||
                  isYearClosed
                }
              >
                {isCalculating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4" />
                )}
                {isCalculating ? "Calculando..." : "Calcular Décimo Tercer Mes"}
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
                value={currentYear}
                onChange={(e) => selectYear(Number.parseInt(e.target.value))}
                min="2000"
                max="2100"
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground pt-4">
            {entriesForCurrentYear.length > 0 && (
              <span>
                Estado:{" "}
                <Badge variant={isYearClosed ? "default" : "secondary"}>
                  {isYearClosed ? "Pagado Completo" : "Cálculo Existente"}
                </Badge>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* --- RESUMEN DEL CÁLCULO (Sección opcional al calcular) --- */}
      {calculatedDecimos.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resumen del Cálculo</CardTitle>
                <CardDescription>
                  Décimo tercer mes calculado para el año {currentYear}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDownloadPDFs("all")}
                  variant="outline"
                  className="gap-2"
                  disabled={isCalculating}
                >
                  <Download className="h-4 w-4" />
                  Descargar Todos
                </Button>
                <Button
                  onClick={() => handleSaveDecimo("pagado_completo")}
                  className="gap-2"
                  disabled={isSaving || isYearClosed}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar Cálculos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Monto Total a Pagar (Grande) */}
            <div className="rounded-lg bg-primary/10 p-6 text-center mb-6">
              <p className="text-sm text-muted-foreground mb-2">
                Monto Neto Total a Pagar
              </p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(totalDecimoNeto)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Monto después de deducciones
              </p>
            </div>

            {/* Pagos Programados (3 Cuotas) */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Pago de Abril</p>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculatedDecimos[0].pagoAbril)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  15 de abril
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Pago de Agosto</p>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculatedDecimos[0].pagoAgosto)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  15 de agosto
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Pago de Diciembre</p>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculatedDecimos[0].pagoDiciembre)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  15 de diciembre
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- CÁLCULO POR EMPLEADO (Tabla Detallada) --- */}
      <Card>
        <CardHeader>
          <CardTitle>Cálculo por Empleado</CardTitle>
          <CardDescription>
            El décimo tercer mes tiene deducciones de CSS (7.25%) e ISR según el
            salario anual del empleado
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
                  <TableHead className="text-right">
                    CSS Patr. (10.75%)
                  </TableHead>
                  <TableHead className="text-right">ISR</TableHead>
                  <TableHead className="text-right">Monto Neto</TableHead>
                  <TableHead className="text-right">Por Pago</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center text-muted-foreground"
                    >
                      No hay empleados activos
                    </TableCell>
                  </TableRow>
                ) : calculatedDecimos.length === 0 && !isCalculating ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center text-muted-foreground"
                    >
                      Presione "Calcular Décimo Tercer Mes" para ver el detalle.
                    </TableCell>
                  </TableRow>
                ) : (
                  calculatedDecimos.map((calc) => {
                    const employeeData = employees.find(
                      (e) => e.id === calc.empleadoId
                    );
                    return (
                      <TableRow key={calc.empleadoId}>
                        <TableCell className="font-medium">
                          {calc.employeeName}
                        </TableCell>
                        <TableCell className="font-mono">
                          {employeeData?.cedula || "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(calc.salarioPromedio)}
                        </TableCell>
                        <TableCell className="text-center">
                          {calc.mesesTrabajados}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(calc.montoTotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                          -{formatCurrency(calc.css)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-600 dark:text-blue-400">
                          {formatCurrency(calc.cssPatrono)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                          -{formatCurrency(calc.isr)}
                        </TableCell>

                        {/* Neto y Por Pago */}
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {formatCurrency(calc.montoNeto)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {/* CORRECCIÓN FINAL: Usamos pagoAbril (la cuota base) */}
                          {formatCurrency(calc.pagoAbril)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEmployeeDetail(calc)}
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
                                <DropdownMenuLabel>
                                  Descargar Comprobantes
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadPDFs("full_pdf", calc)
                                  }
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Comprobante Completo
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadPDFs("voucher_abr", calc)
                                  }
                                >
                                  Voucher Abril
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadPDFs("voucher_ago", calc)
                                  }
                                >
                                  Voucher Agosto
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadPDFs("voucher_dic", calc)
                                  }
                                >
                                  Voucher Diciembre
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {/* Pie de página con notas legales (Coincide con la imagen) */}
        <CardFooter className="pt-6">
          <div className="mt-0 rounded-lg bg-muted p-4 w-full">
            <h4 className="font-semibold mb-2">
              Información sobre el Décimo Tercer Mes en Panamá
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>
                • <strong>Fórmula: Ingresos Totales × 4/12</strong>
              </li>
              <li>
                • Se paga en TRES partes iguales: 15 de abril, 15 de agosto, 15
                de diciembre
              </li>
              <li>
                • <strong>Deducciones empleado:</strong> CSS (7.25%) e ISR según
                salario anual
              </li>
              <li>
                • <strong>Aporte patronal:</strong> CSS (10.75%) sobre el monto
                del décimo
              </li>
              <li>
                • El ISR se calcula sobre el ingreso anual total incluyendo el
                décimo
              </li>
              <li>
                • Cada pago representa 1/3 del monto neto después de deducciones
              </li>
            </ul>
          </div>
        </CardFooter>
      </Card>

      {/* Diálogo de Detalle de Empleado (Mínimo requerido) */}
      <Dialog
        open={!!selectedEmployeeDetail}
        onOpenChange={() => setSelectedEmployeeDetail(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detalle de Décimo Tercer Mes -{" "}
              {selectedEmployeeDetail?.employeeName}
            </DialogTitle>
            <DialogDescription>
              Desglose completo del cálculo para el año {currentYear}
            </DialogDescription>
          </DialogHeader>

          {selectedEmployeeDetail && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Salario Promedio
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(selectedEmployeeDetail.salarioPromedio)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Meses Trabajados
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedEmployeeDetail.mesesTrabajados}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Monto Bruto</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(selectedEmployeeDetail.montoTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                  <span className="text-sm">Total Deducciones (CSS + ISR)</span>
                  <span className="font-mono">
                    -{formatCurrency(selectedEmployeeDetail.totalDeducciones)}
                  </span>
                </div>
                <div className="flex justify-between items-center font-semibold">
                  <span>Monto Neto Final</span>
                  <span className="font-mono text-primary text-xl">
                    {formatCurrency(selectedEmployeeDetail.montoNeto)}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-md font-semibold">Pagos Individuales</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="border p-2 rounded">
                    Abril: {formatCurrency(selectedEmployeeDetail.pagoAbril)}
                  </div>
                  <div className="border p-2 rounded">
                    Agosto: {formatCurrency(selectedEmployeeDetail.pagoAgosto)}
                  </div>
                  <div className="border p-2 rounded">
                    Diciembre:{" "}
                    {formatCurrency(selectedEmployeeDetail.pagoDiciembre)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
