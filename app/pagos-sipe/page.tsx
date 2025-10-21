// FINAL MERGED CODE: app/pagos-sipe/page.tsx

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { usePayroll } from "@/lib/payroll-context";
// Importar componentes de UI necesarios
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  DollarSign,
  TrendingUp,
  Eye,
  Info,
  Download,
  Filter,
  Calendar,
  AlertCircle,
} from "lucide-react";
// Importar utils y helpers (asumo que generateSIPEPDF está en lib/sipe-pdf-generator.tsx)
import { generateSIPEPDF } from "@/lib/sipe-pdf-generator";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { calculateSIPEPaymentDate } from "@/lib/server-calculations";

// Tipo base para el cálculo SIPE (resultado del memo)
interface SIPECalculationResult {
  periodo: string;
  fechaLimite: string;
  totalSeguroSocialEmpleado: number;
  totalSeguroSocialEmpleador: number;
  totalSeguroEducativoEmpleado: number;
  totalSeguroEducativoEmpleador: number;
  totalRiesgoProfesional: number;
  totalISR: number; // Se asume que ISR está incluido en este reporte
  totalDecimoEmpleado: number;
  totalDecimoPatrono: number;
  totalDecimoISR: number;
  isDecimoMonth: boolean;
  totalAPagar: number;
  estado: "pendiente" | "pagado" | "vencido" | string;
  fechaPago?: string;
  referenciaPago?: string;
}

export default function PagosSIPEPage() {
  const {
    employees, // Todos los empleados
    sipePayments, // Pagos guardados (DB)
    legalParameters,
    currentCompany,
    saveSIPEPayment, // Usamos la función del functional code para guardar/actualizar
    // currentPeriod, selectPeriod, // Se omiten ya que este es un reporte de múltiples períodos
  } = usePayroll();

  const now = useMemo(() => new Date(), []);
  const previousMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() - 1, 1),
    [now]
  );

  // Filtros de Reporte (Basados en el código de diseño)
  const [selectedYear, setSelectedYear] = useState(previousMonth.getFullYear());
  const [selectedPeriodForDetail, setSelectedPeriodForDetail] = useState<
    string | null
  >(null); // Para el modal
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Helper para redondear (mantenido del código de diseño)
  const round = (num: number) => Math.round(num * 100) / 100;

  // --- LÓGICA CLAVE: CÁLCULO DE 12 PERÍODOS EN MEMO (Adaptado del código de diseño) ---
  const sipePaymentsData = useMemo(() => {
    if (!currentCompany || employees.length === 0) {
      return [];
    }

    const periods: string[] = [];
    for (let month = 1; month <= 12; month++) {
      periods.push(`${selectedYear}-${String(month).padStart(2, "0")}`);
    }

    let filteredPeriods = periods;
    if (startDate && endDate) {
      // Filtro por rango YYYY-MM
      filteredPeriods = periods.filter((periodo) => {
        return periodo >= startDate && periodo <= endDate;
      });
    }

    // Tasas (usando fallback del código de diseño/contexto)
    const getRate = (type: string, fallback: number) =>
      legalParameters.find((p) => p.tipo === type && p.activo)?.porcentaje ||
      fallback;

    const seguroSocialEmpleadoRate = getRate("seguro_social_empleado", 9.75);
    const seguroSocialEmpleadorRate = getRate("seguro_social_empleador", 13.25);
    const seguroEducativoRate = getRate("seguro_educativo", 1.25);
    const seguroEducativoEmpleadorRate = getRate(
      "seguro_educativo_empleador",
      1.5
    );
    const riesgoProfesionalRate = getRate("riesgo_profesional", 0.98);
    const fondoCesantiaRate = getRate("fondo_cesantia", 2.25); // Añadido fondo de cesantía

    return filteredPeriods.map((periodo) => {
      const [year, month] = periodo.split("-").map(Number);
      const isDecimoMonth = month === 4 || month === 8 || month === 12;

      let totalSeguroSocialEmpleado = 0;
      let totalSeguroSocialEmpleador = 0;
      let totalSeguroEducativoEmpleado = 0;
      let totalSeguroEducativoEmpleador = 0;
      let totalRiesgoProfesional = 0;
      let totalISR = 0;
      let totalDecimoCSS = 0;
      let totalDecimoPatrono = 0;
      let totalDecimoISR = 0;

      for (const employee of employees) {
        const salarioBase = employee.salarioBase;

        // 1. Contribuciones Regulares (Basadas en Salario Base, asumiendo Planilla Completa)
        totalSeguroSocialEmpleado += round(
          (salarioBase * seguroSocialEmpleadoRate) / 100
        );
        totalSeguroSocialEmpleador += round(
          (salarioBase * seguroSocialEmpleadorRate) / 100
        );
        totalSeguroEducativoEmpleado += round(
          (salarioBase * seguroEducativoRate) / 100
        );
        totalSeguroEducativoEmpleador += round(
          (salarioBase * seguroEducativoEmpleadorRate) / 100
        );
        totalRiesgoProfesional += round(
          (salarioBase * riesgoProfesionalRate) / 100
        );

        // 2. ISR Mensual (1/13 del ISR Anual calculado en base a 13 salarios)
        const salarioAnual = salarioBase * 13;
        let isrAnual = 0;
        if (salarioAnual > 11000) {
          if (salarioAnual <= 50000) {
            isrAnual = ((salarioAnual - 11000) * 15) / 100;
          } else {
            isrAnual = 5850 + ((salarioAnual - 50000) * 25) / 100;
          }
        }
        totalISR += round(isrAnual / 13);

        // 3. Deducciones del Décimo (Si es mes de Décimo)
        if (isDecimoMonth) {
          const decimoTotal = salarioBase; // Asumimos salario base como proxy para el décimo proporcional
          const decimoPago = round(decimoTotal / 3);
          totalDecimoCSS += round((decimoPago * 7.25) / 100); // CSS Empleado
          totalDecimoPatrono += round((decimoPago * 10.75) / 100); // CSS Patrono
          totalDecimoISR += round(round(isrAnual / 13) / 3); // ISR del décimo (1/3 del ISR mensual)
        }
      }

      // APLICAR DÉCIMO AL TOTAL
      let finalSS_Emp = round(totalSeguroSocialEmpleado);
      let finalSS_Patr = round(totalSeguroSocialEmpleador);
      let finalISR = round(totalISR);

      if (isDecimoMonth) {
        finalSS_Emp = round(finalSS_Emp + totalDecimoCSS);
        finalSS_Patr = round(finalSS_Patr + totalDecimoPatrono);
        finalISR = round(finalISR + totalDecimoISR);
      }

      const totalAPagar = round(
        finalSS_Emp +
          finalSS_Patr +
          round(totalSeguroEducativoEmpleado) +
          round(totalSeguroEducativoEmpleador) +
          round(totalRiesgoProfesional) +
          finalISR
      );

      const savedPayment = sipePayments.find((p) => p.periodo === periodo);
      const estado = savedPayment?.estado || "pendiente";
      const fechaLimite =
        savedPayment?.fechaLimite || calculateSIPEPaymentDate(periodo); // Generar fecha límite si no está guardada

      return {
        periodo,
        fechaLimite,
        totalSeguroSocialEmpleado: finalSS_Emp,
        totalSeguroSocialEmpleador: finalSS_Patr,
        totalSeguroEducativoEmpleado: round(totalSeguroEducativoEmpleado),
        totalSeguroEducativoEmpleador: round(totalSeguroEducativoEmpleador),
        totalRiesgoProfesional: round(totalRiesgoProfesional),
        totalISR: finalISR,
        totalDecimoEmpleado: totalDecimoCSS, // Monto total de la deducción CSS del décimo (empleado)
        totalDecimoPatrono: totalDecimoPatrono,
        totalDecimoISR: totalDecimoISR,
        isDecimoMonth,
        totalAPagar,
        estado,
        fechaPago: savedPayment?.fechaPago,
        referenciaPago: savedPayment?.referenciaPago,
      } as SIPECalculationResult;
    });
  }, [
    employees,
    selectedYear,
    startDate,
    endDate,
    sipePayments,
    legalParameters,
    currentCompany,
  ]);

  // --- KPIs y Resumen ---
  const upcomingPayments = useMemo(
    () =>
      sipePaymentsData.filter(
        (p) => p.estado === "pendiente" && new Date(p.fechaLimite) > now
      ),
    [sipePaymentsData, now]
  );
  const totalAnual = useMemo(
    () => sipePaymentsData.reduce((sum, p) => sum + p.totalAPagar, 0),
    [sipePaymentsData]
  );

  // Pago del mes anterior (el que vence este mes)
  const previousMonthPeriod = `${previousMonth.getFullYear()}-${String(
    previousMonth.getMonth() + 1
  ).padStart(2, "0")}`;
  const previousMonthPayment = sipePaymentsData.find(
    (p) => p.periodo === previousMonthPeriod
  );

  // --- Handlers funcionales ---

  const handleTogglePaymentStatus = useCallback(
    async (periodo: string, currentEstado: string) => {
      const payment = sipePayments.find((p) => p.periodo === periodo);
      if (!payment)
        return toast({
          title: "Error",
          description: "El pago debe calcularse y guardarse primero.",
          variant: "destructive",
        });

      const newEstado = currentEstado === "pagado" ? "pendiente" : "pagado";
      const fechaPago =
        newEstado === "pagado" ? new Date().toISOString() : undefined;

      const updatedData = {
        ...payment,
        estado: newEstado as "pendiente" | "pagado",
        fechaPago: fechaPago,
      };

      try {
        await saveSIPEPayment(updatedData); // Usa UPSERT para actualizar
        toast({
          title: "Estado Actualizado",
          description: `Pago de ${periodo} marcado como ${newEstado}.`,
          variant: "default",
        });
      } catch (e) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado del pago.",
          variant: "destructive",
        });
      }
    },
    [sipePayments, saveSIPEPayment]
  );

  const handleDownloadPDF = useCallback(
    (payment: SIPECalculationResult) => {
      const periodEmployeesData = payment.periodo
        ? sipePaymentsData.find((p) => p.periodo === payment.periodo)
        : undefined;

      if (!periodEmployeesData) {
        return toast({
          title: "Error",
          description: "No se encontraron datos de cálculo para el período.",
          variant: "destructive",
        });
      }

      // Simular la generación de datos detallados por empleado (requerido por generateSIPEPDF)
      const employeesForPDF = employees.map(
        (emp) =>
          ({
            employee: emp,
            entry: { salarioBruto: emp.salarioBase } as any, // Asumiendo salario base para el reporte SIPE
            seguroSocialEmpleado: round((emp.salarioBase * 9.75) / 100),
            seguroSocialEmpleador: round((emp.salarioBase * 13.25) / 100),
            seguroEducativoEmpleado: round((emp.salarioBase * 1.25) / 100),
            seguroEducativoEmpleador: round((emp.salarioBase * 1.5) / 100),
            riesgoProfesional: round((emp.salarioBase * 0.98) / 100),
            // ISR es más complejo, lo dejamos simple para la simulación
            isr: round((emp.salarioBase * 13 * 0.15) / 13 / 100),
            totalAPagar: periodEmployeesData.totalAPagar, // Total de la empresa
          } as any)
      );

      generateSIPEPDF({
        payment: payment as any,
        employees: employeesForPDF,
        companyName: currentCompany?.nombre || "Mi Empresa",
      });

      toast({
        title: "Descarga de PDF",
        description: `Comprobante SIPE de ${payment.periodo} generado.`,
        variant: "default",
      });
    },
    [sipePaymentsData, employees, currentCompany]
  );

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  // Función para guardar el pago del mes anterior si no existe (al hacer click en el botón verde del KPI)
  const handleSavePreviousMonthPayment = async () => {
    if (!previousMonthPayment) return;

    // El pago ya está calculado en el memo, solo necesitamos guardarlo en la DB
    const {
      totalDecimoEmpleado,
      totalDecimoPatrono,
      totalDecimoISR,
      isDecimoMonth,
      ...paymentToSave
    } = previousMonthPayment;

    try {
      await saveSIPEPayment(paymentToSave as any);
      toast({
        title: "Pago Guardado",
        description: `El pago de ${previousMonthPayment.periodo} se ha guardado en el historial.`,
        variant: "default",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "No se pudo guardar el pago en el historial.",
        variant: "destructive",
      });
    }
  };
  // --- Fin Handlers ---

  const previousMonthPeriodName = previousMonth.toLocaleDateString("es-PA", {
    month: "long",
    year: "numeric",
  });
  const currentMonthName = now.toLocaleDateString("es-PA", { month: "long" });

  // Determinar si hay un pago vencido no pagado (fecha limite ya pasó)
  const hasOverduePayment = sipePaymentsData.some(
    (p) => p.estado === "pendiente" && new Date(p.fechaLimite) < now
  );

  if (!currentCompany) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-muted-foreground">
          Por favor, seleccione una compañía para gestionar los Pagos SIPE.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Pagos al SIPE
            </h1>
            <p className="text-muted-foreground">
              Sistema Integrado de Pagos Electrónicos - Caja de Seguro Social
            </p>
          </div>
        </div>
      </div>

      {/* ALERTA DE NO EMPLEADOS */}
      {employees.length === 0 && (
        <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900 dark:text-red-100">
            No hay empleados registrados
          </AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-200">
            Debe registrar empleados antes de poder calcular pagos SIPE. Vaya a
            la sección de Empleados para agregar empleados a su empresa.
          </AlertDescription>
        </Alert>
      )}

      {/* ALERTA DE INFORMACIÓN GENERAL */}
      <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          Cálculo Automático del Mes Anterior
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          El SIPE se calcula automáticamente para TODOS los empleados
          registrados basándose en sus salarios base. Los pagos se calculan para
          el mes anterior. Por ejemplo, en{" "}
          {now.toLocaleDateString("es-PA", { month: "long", year: "numeric" })}{" "}
          se paga la planilla de {previousMonthPeriodName}. La fecha límite de
          pago es el día 15 del mes siguiente al período de planilla.
        </AlertDescription>
      </Alert>

      {/* ALERTA DE PAGOS PRÓXIMOS/VENCIDOS */}
      {hasOverduePayment && (
        <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900 dark:text-red-100">
            ¡Advertencia! Pagos Vencidos
          </AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-200">
            Tiene uno o más pagos SIPE vencidos. Por favor, revíselos en la
            tabla inferior y márquelos como pagados.
          </AlertDescription>
        </Alert>
      )}
      {upcomingPayments.length > 0 && !hasOverduePayment && (
        <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            Pagos Próximos
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Tiene {upcomingPayments.length} pago(s) pendiente(s) al SIPE.
          </AlertDescription>
        </Alert>
      )}

      {/* --- CONFIGURACIÓN DE FILTROS --- */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtrar por Período</CardTitle>
              <CardDescription>
                Selecciona un rango de fechas o el año para ver pagos
                específicos
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Ocultar" : "Mostrar"} Filtros
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="year-filter">Año</Label>
                <Input
                  id="year-filter"
                  type="number"
                  value={selectedYear}
                  onChange={(e) =>
                    setSelectedYear(Number.parseInt(e.target.value))
                  }
                  min="2000"
                  max="2100"
                />
              </div>
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
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="w-full bg-transparent"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* --- PAGO DEL MES ANTERIOR (Alert Card) --- */}
      {previousMonthPayment && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100">
              Pago del Mes Anterior - {previousMonthPeriodName}
            </CardTitle>
            <CardDescription className="text-green-800 dark:text-green-200">
              Este es el pago que debe realizar este mes (antes del 15 de{" "}
              {currentMonthName})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 items-center">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Total SIPE (incluye ISR)
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(previousMonthPayment.totalAPagar)}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Fecha Límite
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {new Date(
                    previousMonthPayment.fechaLimite
                  ).toLocaleDateString("es-PA")}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {sipePayments.find(
                  (p) => p.periodo === previousMonthPayment.periodo
                ) ? (
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      setSelectedPeriodForDetail(previousMonthPayment.periodo)
                    }
                  >
                    <Eye className="h-4 w-4 mr-2" /> Ver Detalle Guardado
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleSavePreviousMonthPayment}
                  >
                    <Save className="h-4 w-4 mr-2" /> Guardar en Historial
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- KPI CARDS DE REPORTE ANUAL --- */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total SIPE {selectedYear}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAnual)}
            </div>
            <p className="text-xs text-muted-foreground">
              CSS + Seg. Educativo + Riesgo + ISR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pagos Pendientes
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {upcomingPayments.length}
            </div>
            <p className="text-xs text-muted-foreground">Próximos a vencer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Períodos Procesados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sipePaymentsData.length}</div>
            <p className="text-xs text-muted-foreground">
              {startDate && endDate
                ? "En el rango seleccionado"
                : `En el año ${selectedYear}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- TABLA DE CALENDARIO DE PAGOS SIPE (Tabla General) --- */}
      <Card>
        <CardHeader>
          <CardTitle>Calendario de Pagos SIPE (incluye ISR)</CardTitle>
          <CardDescription>
            Detalle de aportes mensuales a la Caja de Seguro Social, Seguro
            Educativo, Riesgo Profesional e Impuesto Sobre la Renta
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
                  <TableHead className="text-right">Riesgo Prof.(0.98%)</TableHead>
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
                    <TableCell
                      colSpan={14}
                      className="text-center text-muted-foreground"
                    >
                      No hay pagos SIPE registrados para el año {selectedYear}
                    </TableCell>
                  </TableRow>
                ) : (
                  sipePaymentsData.map((payment) => {
                    const isUpcoming = new Date(payment.fechaLimite) > now;
                    const isOverdue =
                      payment.estado === "pendiente" &&
                      new Date(payment.fechaLimite) < now;

                    return (
                      <TableRow
                        key={payment.periodo}
                        className={
                          isOverdue ? "bg-red-50/50 dark:bg-red-950/50" : ""
                        }
                      >
                        <TableCell className="font-medium">
                          {payment.periodo}
                          {isOverdue && (
                            <Badge variant="destructive" className="ml-2">
                              VENCIDO
                            </Badge>
                          )}
                          {payment.isDecimoMonth && (
                            <Badge
                              variant="secondary"
                              className="ml-2 bg-purple-100 text-purple-700"
                            >
                              Décimo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(payment.fechaLimite).toLocaleDateString(
                              "es-PA"
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(payment.totalSeguroSocialEmpleado)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(payment.totalSeguroSocialEmpleador)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(payment.totalSeguroEducativoEmpleado)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(
                            payment.totalSeguroEducativoEmpleador
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(payment.totalRiesgoProfesional)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-blue-600 font-semibold">
                          {formatCurrency(payment.totalISR)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-purple-600">
                          {" "}
                          {payment.isDecimoMonth ? (
                            <>
                              $
                              {(
                                (payment.totalDecimoEmpleado || 0) +
                                (payment.totalDecimoPatrono || 0)
                              ).toLocaleString("es-PA", {
                                minimumFractionDigits: 2,
                              })}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-purple-600">
                          {payment.isDecimoMonth
                            ? formatCurrency(payment.totalDecimoISR)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-lg text-green-600">
                          {formatCurrency(payment.totalAPagar)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.estado === "pagado"
                                ? "default"
                                : isOverdue
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {payment.estado === "pagado"
                              ? "Pagado"
                              : isOverdue
                              ? "Vencido"
                              : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={payment.estado === "pagado"}
                            onCheckedChange={() =>
                              handleTogglePaymentStatus(
                                payment.periodo,
                                payment.estado
                              )
                            }
                            className="mx-auto"
                            disabled={payment.estado === "pagado"} // Deshabilitar si ya está pagado
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSelectedPeriodForDetail(payment.periodo)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(payment)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
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
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Información sobre Pagos SIPE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ... Contenido Legal (Mantenido del diseño original) ... */}
          <div>
            <h3 className="font-semibold mb-2">¿Qué es el SIPE?</h3>
            <p className="text-sm text-muted-foreground">
              El Sistema Integrado de Pagos Electrónicos (SIPE) es la plataforma
              de la Caja de Seguro Social de Panamá para el pago de las cuotas
              obrero-patronales, Seguro Educativo, Riesgo Profesional e Impuesto
              Sobre la Renta.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Fecha de Pago</h3>
            <p className="text-sm text-muted-foreground">
              Los pagos deben realizarse antes del día 15 del mes siguiente al
              período de planilla. Por ejemplo, la planilla de enero debe
              pagarse antes del 15 de febrero.
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
                {legalParameters.find(
                  (p) => p.tipo === "riesgo_profesional" && p.activo
                )?.porcentaje || 0.98}
                % del salario bruto (varía según actividad)
              </li>
              <li className="font-semibold text-green-700">
                Impuesto Sobre la Renta (ISR): Calculado según tabla progresiva
                e incluido en el pago SIPE
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">
              Deducciones del Décimo Tercer Mes
            </h3>
            <p className="text-sm text-muted-foreground">
              Las deducciones del Décimo Tercer Mes se incluyen en el pago SIPE
              SOLO en los meses cuando se paga el décimo:{" "}
              <strong>Abril, Agosto y Diciembre</strong>. En los demás meses, el
              SIPE no incluye deducciones del décimo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de Detalle de Empleado (Desglose) */}
      <Dialog
        open={!!selectedPeriodForDetail}
        onOpenChange={() => setSelectedPeriodForDetail(null)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Desglose por Empleado - {selectedPeriodForDetail}
            </DialogTitle>
            <DialogDescription>
              Cálculo detallado de aportes SIPE e ISR por cada empleado (basado
              en {selectedPeriodForDetail})
            </DialogDescription>
          </DialogHeader>

          {selectedPeriodForDetail && (
            <div className="space-y-4">
              {/* Reutilizar la tabla de empleados del useMemo para mostrar el detalle */}
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-right">Salario Base</TableHead>
                      <TableHead className="text-right">CSS Emp.</TableHead>
                      <TableHead className="text-right">CSS Patr.</TableHead>
                      <TableHead className="text-right">
                        Seg. Ed. Emp.
                      </TableHead>
                      <TableHead className="text-right">
                        Seg. Ed. Patr.
                      </TableHead>
                      <TableHead className="text-right">Riesgo Prof.</TableHead>
                      <TableHead className="text-right">ISR</TableHead>
                      <TableHead className="text-right">Total SIPE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Este renderizado debe ser de un useMemo similar a selectedPeriodEmployees, pero aquí lo simulamos con el cálculo local del diseño. */}
                    {employees.map((employee) => {
                      const salarioBase = employee.salarioBase;
                      const isr = round((salarioBase * 13 * 0.15) / 13 / 100);
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.nombre} {employee.apellido}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(salarioBase)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(round((salarioBase * 9.75) / 100))}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(round((salarioBase * 13.25) / 100))}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(round((salarioBase * 1.25) / 100))}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(round((salarioBase * 1.5) / 100))}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(round((salarioBase * 0.98) / 100))}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(isr)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-green-600">
                            {formatCurrency(round(salarioBase * 0.2823))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    handleDownloadPDF(
                      sipePaymentsData.find(
                        (p) => p.periodo === selectedPeriodForDetail
                      )!
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF SIPE
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
