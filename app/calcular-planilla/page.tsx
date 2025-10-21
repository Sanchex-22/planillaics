// File: app/calcular-planilla/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { usePayroll } from "@/lib/payroll-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Employee, PayrollEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
// Nota: Importé Eye y EyeOff, que podrías necesitar para el salario en la tabla
import {
  Check,
  Loader2,
  Save,
  Trash2,
  Eye,
  Calculator,
  CalendarIcon,
  FileInput,
} from "lucide-react";
import { PayrollDetailDialog } from "@/components/payroll-detail-dialog";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { PayrollCalculationInput } from "@/lib/server-calculations";
import { PayrollCalculationResult } from "@/lib/payroll-calculations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ... (Interface CalculatedPayroll) ...
interface CalculatedPayroll extends PayrollCalculationResult {
  employee: Employee;
  periodo: string;
  tipoPeriodo: "quincenal" | "mensual";
  horasExtras: number;
  bonificaciones: number;
  otrosIngresos: number;
  otrasRetenciones: number;
  fondoCesantia: number;
  estado: "calculado" | "pagado" | "borrador" | "aprobado";
}

export default function CalcularPlanillaPage() {
  const {
    currentCompany,
    employees: employeesContext,
    legalParameters,
    isrBrackets,
    payrollEntries: payrollEntriesContext,
    savePayrollEntries,
    deletePeriodPayroll,
    currentPeriod,
    selectPeriod,
    calculatePayrollApi,
  } = usePayroll();

  // Fallback de contexto
  const employees = employeesContext || [];
  const payrollEntries = payrollEntriesContext || [];

  const [calculatedPlanilla, setCalculatedPlanilla] = useState<
    CalculatedPayroll[]
  >([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CalculatedPayroll | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoPeriodo, setTipoPeriodo] = useState<"quincenal" | "mensual">(
    "quincenal"
  );
  const [periodoQuincenal, setPeriodoQuincenal] = useState<
    "primera" | "segunda"
  >("primera");
  const [horasExtrasMap, setHorasExtrasMap] = useState<Record<string, number>>(
    {}
  );
  const [bonificacionesMap, setBonificacionesMap] = useState<
    Record<string, number>
  >({});
  const [otrosIngresosMap, setOtrosIngresosMap] = useState<
    Record<string, number>
  >({});
  const [otrasRetencionesMap, setOtrasRetencionesMap] = useState<
    Record<string, number>
  >({});

  const finalPeriod = useMemo(() => {
    if (tipoPeriodo === "mensual") return currentPeriod;
    // Lógica para obtener el último día del mes y usarlo como día de la quincena
    const date = new Date(
      parseInt(currentPeriod.slice(0, 4)),
      parseInt(currentPeriod.slice(5, 7)),
      0
    );
    const lastDayOfMonth = format(date, "dd");
    // Aseguramos que los valores sean 'primera'/'segunda' y no '1'/'2'
    const day = periodoQuincenal === "primera" ? "15" : lastDayOfMonth;
    return `${currentPeriod}-${day}`;
  }, [currentPeriod, tipoPeriodo, periodoQuincenal]);

  const existingEntries = useMemo(
    () => payrollEntries.filter((e) => e.periodo === finalPeriod),
    [payrollEntries, finalPeriod]
  );
  const isPeriodClosed =
    existingEntries.length > 0 &&
    existingEntries.every((e) => e.estado === "pagado");

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.estado === "activo"),
    [employees]
  );

  // --- Handlers de Cálculo y Guardado ---

  const handleCalculatePayroll = async () => {
    if (!currentCompany || activeEmployees.length === 0) {
      toast({
        title: "Advertencia",
        description: "No hay empleados activos o compañía seleccionada.",
        variant: "default",
      });
      return;
    }

    if (legalParameters.length === 0 || isrBrackets.length === 0) {
      toast({
        title: "Advertencia",
        description:
          "Faltan parámetros legales o la tabla ISR. Configúralos primero.",
        variant: "default",
      });
      return;
    }

    setIsCalculating(true);
    const newCalculations: CalculatedPayroll[] = [];

    try {
      for (const employee of activeEmployees) {
        const input: PayrollCalculationInput = {
          employee: employee,
          periodo: finalPeriod,
          tipoPeriodo: tipoPeriodo,
          horasExtras: horasExtrasMap[employee.id] || 0,
          bonificaciones: bonificacionesMap[employee.id] || 0,
          otrosIngresos: otrosIngresosMap[employee.id] || 0,
          otrasRetenciones: otrasRetencionesMap[employee.id] || 0,
          legalParameters: legalParameters,
          isrBrackets: isrBrackets,
        };

        const result = await calculatePayrollApi({
          ...input,
          currentLegalParameters: legalParameters,
          currentISRBrackets: isrBrackets,
        });

        const payrollEntry: CalculatedPayroll = {
          ...result,
          employee: employee,
          periodo: finalPeriod,
          tipoPeriodo: tipoPeriodo,
          horasExtras: input.horasExtras ?? 0,
          bonificaciones: input.bonificaciones ?? 0,
          otrosIngresos: input.otrosIngresos ?? 0,
          otrasRetenciones: input.otrasRetenciones ?? 0,
          estado: "calculado",
          fondoCesantia: (result as any).fondoCesantia ?? 0,
        };

        newCalculations.push(payrollEntry);
      }

      setCalculatedPlanilla(newCalculations);
      toast({
        title: "Cálculo Completo",
        description: `Se calcularon ${newCalculations.length} entradas para el período ${finalPeriod}.`,
        variant: "default",
      });
    } catch (e) {
      console.error("Error calculating payroll:", e);
      toast({
        title: "Error",
        description:
          "Fallo el cálculo de la planilla. Verifique los parámetros y la consola.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Sincronización de entradas existentes con el estado CalculatedPayroll
  useEffect(() => {
    if (existingEntries.length > 0) {
      const syncedData: CalculatedPayroll[] = existingEntries
        .map((e) => {
          const employee = employees.find((emp) => emp.id === e.empleadoId);

          if (!employee) return null;

          return {
            ...e,
            employee: employee,
            // Asegurar que los campos numéricos existen para el tipo
            salarioBruto: e.salarioBruto ?? 0,
            seguroSocialEmpleado: e.seguroSocialEmpleado ?? 0,
            seguroEducativo: e.seguroEducativo ?? 0,
            isr: e.isr ?? 0,
            totalDeducciones: (e as any).totalDeducciones ?? 0,
            salarioNeto: e.salarioNeto ?? 0,
            seguroSocialEmpleador: e.seguroSocialEmpleador ?? 0,
            seguroEducativoEmpleador: e.seguroEducativoEmpleador ?? 0,
            riesgoProfesional: e.riesgoProfesional ?? 0,
            fondoCesantia: e.fondoCesantia ?? 0,

            horasExtras: e.horasExtras ?? 0,
            bonificaciones: e.bonificaciones ?? 0,
            otrosIngresos: e.otrosIngresos ?? 0,
            otrasRetenciones: e.otrasRetenciones ?? 0,

            tipoPeriodo: e.tipoPeriodo as "quincenal" | "mensual",
            deduccionesBancarias: e.deduccionesBancarias ?? 0,
            prestamos: e.prestamos ?? 0,
            otrasDeduccionesPersonalizadas:
              e.otrasDeduccionesPersonalizadas ?? 0,

            estado: e.estado as "pagado" | "borrador" | "aprobado",
          } as CalculatedPayroll;
        })
        .filter((e): e is CalculatedPayroll => e !== null);

      setCalculatedPlanilla(syncedData);

      // Sincronizar inputs de extras
      const newHorasExtrasMap: Record<string, number> = {};
      const newBonificacionesMap: Record<string, number> = {};
      const newOtrosIngresosMap: Record<string, number> = {};
      const newOtrasRetencionesMap: Record<string, number> = {};

      syncedData.forEach((entry) => {
        newHorasExtrasMap[entry.employee.id] = entry.horasExtras;
        newBonificacionesMap[entry.employee.id] = entry.bonificaciones;
        newOtrosIngresosMap[entry.employee.id] = entry.otrosIngresos;
        newOtrasRetencionesMap[entry.employee.id] = entry.otrasRetenciones;
      });

      setHorasExtrasMap(newHorasExtrasMap);
      setBonificacionesMap(newBonificacionesMap);
      setOtrosIngresosMap(newOtrosIngresosMap);
      setOtrasRetencionesMap(newOtrasRetencionesMap);
    } else {
      setCalculatedPlanilla([]);
    }
  }, [existingEntries, employees]);

  const handleSavePayroll = async (
    estado: "pagado" | "borrador" | "aprobado"
  ) => {
    if (calculatedPlanilla.length === 0 || !currentCompany) return;

    setIsSaving(true);
    try {
      const entriesToSave: PayrollEntry[] = calculatedPlanilla.map((calc) => {
        const existingId = existingEntries.find(
          (e) => e.empleadoId === calc.employee.id
        )?.id;

        return {
          id: existingId || `temp-${calc.employee.id}`,
          companiaId: currentCompany.id,
          empleadoId: calc.employee.id,
          periodo: calc.periodo,
          tipoPeriodo: calc.tipoPeriodo,
          salarioBruto: calc.salarioBruto,
          horasExtras: calc.horasExtras,
          bonificaciones: calc.bonificaciones,
          otrosIngresos: calc.otrosIngresos,
          seguroSocialEmpleado: calc.seguroSocialEmpleado,
          seguroEducativo: calc.seguroEducativo,
          isr: calc.isr,
          deduccionesBancarias: calc.deduccionesBancarias,
          prestamos: calc.prestamos,
          otrasDeduccionesPersonalizadas: calc.otrasDeduccionesPersonalizadas,
          salarioNeto: calc.salarioNeto,
          fechaCalculo: new Date().toISOString(),
          estado: estado,
          seguroSocialEmpleador: calc.seguroSocialEmpleador,
          seguroEducativoEmpleador: calc.seguroEducativoEmpleador,
          riesgoProfesional: calc.riesgoProfesional,
          fondoCesantia: calc.fondoCesantia,
          totalDeducciones: calc.totalDeducciones,
          otrasRetenciones: calc.otrasRetenciones,
        } as PayrollEntry;
      });

      await savePayrollEntries(entriesToSave);
      toast({
        title: "Guardado Exitoso",
        description: `La planilla se guardó como ${estado}.`,
        variant: "default",
      });
    } catch (e) {
      console.error("Error saving payroll:", e);
      toast({
        title: "Error al Guardar",
        description: "Fallo al guardar la planilla. Revise la consola.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPayroll = async () => {
    if (existingEntries.length === 0) return;
    try {
      await deletePeriodPayroll(finalPeriod);
      setCalculatedPlanilla([]);
      toast({
        title: "Planilla Eliminada",
        description: `La planilla del período ${finalPeriod} fue eliminada.`,
        variant: "default",
      });
    } catch (e) {
      console.error("Error clearing payroll:", e);
      toast({
        title: "Error al Eliminar",
        description: "Fallo al limpiar la planilla. Revise la consola.",
        variant: "destructive",
      });
    }
  };

  const createMapHandler =
    (mapSetter: React.Dispatch<React.SetStateAction<Record<string, number>>>) =>
    (employeeId: string, value: string) => {
      mapSetter((prev) => ({
        ...prev,
        [employeeId]: Number(value) || 0,
      }));
    };

  const handleHorasExtrasChange = useMemo(
    () => createMapHandler(setHorasExtrasMap),
    []
  );
  const handleBonificacionesChange = useMemo(
    () => createMapHandler(setBonificacionesMap),
    []
  );
  const handleOtrosIngresosChange = useMemo(
    () => createMapHandler(setOtrosIngresosMap),
    []
  );
  const handleOtrasRetencionesChange = useMemo(
    () => createMapHandler(setOtrasRetencionesMap),
    []
  );

  // --- Estructura Visual (Corregida) ---
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1">Calcular Planilla</h1>
      <p className="text-muted-foreground mb-6">
        Calcule la planilla quincenal o mensual con todas las deducciones
        legales
      </p>

      {/* Tarjeta 1: Configuración del Período de Pago */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Configuración del Período de Pago
          </CardTitle>
          <CardDescription>
            Seleccione el tipo de período y las fechas para calcular la planilla
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Columna 1: Tipo de Período */}
            <div className="space-y-2">
              <Label htmlFor="tipo-periodo">Tipo de Período</Label>
              <Select
                value={tipoPeriodo}
                defaultValue="quincenal"
                onValueChange={(value: "quincenal" | "mensual") => {
                  setTipoPeriodo(value);
                  setPeriodoQuincenal("primera");
                }}
              >
                <SelectTrigger id="tipo-periodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quincenal">
                    Quincenal (cada 15 días)
                  </SelectItem>
                  <SelectItem value="mensual">
                    Mensual (mes completo)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Columna 2: Mes y Año + Quincena */}
            <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="period-selector">Mes y Año</Label>
                <Input
                  id="mes"
                  type="month"
                  value={currentPeriod} // FIX: value debe ser currentPeriod
                  onChange={(e) => selectPeriod(e.target.value)} // FIX: onChange llama a selectPeriod
                />
                {/* Texto debajo del selector de mes, como en la imagen */}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(currentPeriod + "-01"), "MMMM de yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
              {tipoPeriodo === "quincenal" && (
                <div className="flex-1 space-y-2">
                  <Label htmlFor="quincena">Quincena</Label>
                  <Select
                    defaultValue="primera"
                    value={periodoQuincenal}
                    onValueChange={(value: "primera" | "segunda") =>
                      setPeriodoQuincenal(value)
                    }
                  >
                    <SelectTrigger id="quincena">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primera">
                        Primera Quincena (1-15)
                      </SelectItem>
                      <SelectItem value="segunda">
                        Segunda Quincena (16-fin de mes)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Fila del Período a Pagar y Botón de Cálculo */}
          <div className="rounded-lg bg-primary/10 p-4 border-2 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                {/* Alineación visual con el código de ejemplo */}
                <p className="text-sm font-medium text-muted-foreground">
                  Período a Pagar
                </p>
                <p className="text-2xl font-bold text-primary">
                  {periodoQuincenal === "primera"
                    ? `1 - 15 de ${format(
                        parseISO(`${currentPeriod}-01`),
                        "MMMM yyyy",
                        { locale: es }
                      )}`
                    : `16 - ${format(parseISO(finalPeriod), "dd")} de ${format(
                        parseISO(`${currentPeriod}-01`),
                        "MMMM yyyy",
                        { locale: es }
                      )}`}
                </p>
              </div>

              {/* Alineación visual con el código de ejemplo */}
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {tipoPeriodo === "quincenal" ? "15 días" : "Mes completo"}
              </Badge>
            </div>
          </div>

          <Button
            onClick={handleCalculatePayroll}
            disabled={
              isCalculating || !currentCompany || activeEmployees.length === 0
            }
            className="w-full text-lg h-12 bg-primary hover:bg-primary/90"
          >
            {isCalculating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-5 w-5" />
            )}
            {isCalculating ? "Calculando Planilla..." : `Calcular Planilla para ${finalPeriod}`}
          </Button>
        </CardContent>
      </Card>

      {/* Tarjeta 2: Empleados Activos y Extras/Bonificaciones */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Empleados Activos ({activeEmployees.length})</CardTitle>
          <CardDescription>
            Configure extras, bonificaciones y otras retenciones para cada
            empleado. Las deducciones legales se aplican automáticamente en el
            cálculo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Empleado</TableHead>
                  <TableHead className="text-right">Salario Base</TableHead>
                  <TableHead className="text-right">Horas Extras ($)</TableHead>
                  <TableHead className="text-right">
                    Bonificaciones ($)
                  </TableHead>
                  <TableHead className="text-right">
                    Otros Ingresos ($)
                  </TableHead>
                  <TableHead className="text-right">
                    Otras Retenciones ($)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-12 text-center text-muted-foreground"
                    >
                      No hay empleados activos.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.nombre} {employee.apellido}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(employee.salarioBase)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={horasExtrasMap[employee.id] || ""}
                          onChange={(e) =>
                            handleHorasExtrasChange(employee.id, e.target.value)
                          }
                          className="w-full text-right h-8"
                          placeholder="0.00"
                          disabled={isPeriodClosed}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={bonificacionesMap[employee.id] || ""}
                          onChange={(e) =>
                            handleBonificacionesChange(
                              employee.id,
                              e.target.value
                            )
                          }
                          className="w-full text-right h-8"
                          placeholder="0.00"
                          disabled={isPeriodClosed}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={otrosIngresosMap[employee.id] || ""}
                          onChange={(e) =>
                            handleOtrosIngresosChange(
                              employee.id,
                              e.target.value
                            )
                          }
                          className="w-full text-right h-8"
                          placeholder="0.00"
                          disabled={isPeriodClosed}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={otrasRetencionesMap[employee.id] || ""}
                          onChange={(e) =>
                            handleOtrasRetencionesChange(
                              employee.id,
                              e.target.value
                            )
                          }
                          className="w-full text-right h-8 text-destructive"
                          placeholder="0.00"
                          disabled={isPeriodClosed}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tarjeta 3: Resultados (Detalle de Cálculo) */}
      {calculatedPlanilla.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Resultados del Cálculo de Planilla ({finalPeriod})
            </CardTitle>
            <CardDescription>
              Resumen de salarios netos y deducciones por empleado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Empleado</TableHead>
                    <TableHead className="text-right">Salario Bruto</TableHead>
                    <TableHead className="text-right text-destructive">
                      Total Deducciones
                    </TableHead>
                    <TableHead className="text-right text-primary">
                      Neto a Pagar
                    </TableHead>
                    <TableHead className="w-[100px] text-center">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculatedPlanilla.map((entry) => (
                    <TableRow key={entry.employee.id}>
                      <TableCell className="font-medium">
                        {entry.employee.nombre} {entry.employee.apellido}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(entry.salarioBruto)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {formatCurrency(entry.totalDeducciones)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        {formatCurrency(entry.salarioNeto)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botones de Acción Global */}
      {calculatedPlanilla.length > 0 && (
        <div className="flex justify-end space-x-4 mt-6">
          <Button
            onClick={() => handleSavePayroll("borrador")}
            variant="outline"
            disabled={isSaving || isPeriodClosed}
          >
            {isSaving ? (
              <Spinner className="w-4 h-4 mr-2" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Borrador
          </Button>

          <Button
            onClick={() => handleSavePayroll("aprobado")}
            variant="default"
            disabled={isSaving || isPeriodClosed}
          >
            {isSaving ? (
              <Spinner className="w-4 h-4 mr-2" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Guardar y Aprobar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isSaving || existingEntries.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar Periodo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Eliminar Planilla del Período?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará todas las entradas de planilla para el
                  período <span className="font-bold">{finalPeriod}</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleClearPayroll}
                >
                  Confirmar Eliminación
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Diálogo de Detalles */}
      <PayrollDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={selectedEntry?.employee as Employee}
        calculation={selectedEntry as PayrollCalculationResult}
        periodo={selectedEntry?.periodo || ""}
      />
    </div>
  );
}
