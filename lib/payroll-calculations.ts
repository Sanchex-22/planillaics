// payroll-calculations.ts
// Integrado COMPLETO con reglas Panamá (2025), cálculo de décimo, ISR, CSS, SE y SIPE.
// Incluye funciones por empleado, totales de empresa y ALIAS de compatibilidad
// para conservar nombres de campos antiguos (totalAPagar, totalDecimoEmpleado, etc.).

/* ------------------------------------------------------
 * Tipos
 * ------------------------------------------------------ */
export interface Employee {
  id: string | number;
  salarioBase: number; // mensual
  fechaContratacion?: string; // ISO YYYY-MM-DD (opcional)
}

export interface LegalParameters {
  tipo: string;       // p.ej. "ss_empleado", "ss_empleador", "se_empleado", "se_empleador", "ss_empleado_decimo", "riesgo_profesional"
  porcentaje: number; // tasa en %
  activo: boolean;
}

export interface ISRBracket {
  limite?: number;     // límite superior del tramo; si falta o es NaN, se considera abierto
  tasa: number;        // porcentaje del tramo
}

export interface PayrollEntry {
  empleadoId: string | number;
  periodo: string;     // "YYYY-MM"
  salarioBruto: number;
  estado?: "borrador" | "confirmado" | string;
}

/* ------------------------------------------------------
 * Utilidades
 * ------------------------------------------------------ */
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export function assertPeriodo(p: string) {
  if (!PERIOD_RE.test(p)) throw new Error(`periodo inválido: "${p}" (formato esperado YYYY-MM)`);
}

export function round(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
const toCents = (n: number) => Math.round((n + Number.EPSILON) * 100);
const fromCents = (c: number) => Math.round(c) / 100;

const monthFromPeriodo = (periodo: string) => parseInt(periodo.split("-")[1], 10);
export const isDecimoMonth = (periodo: string) => {
  const m = monthFromPeriodo(periodo);
  return m === 4 || m === 8 || m === 12;
};

export function calculateSIPEPaymentDate(periodo: string): string {
  // Fecha límite simple = último día del mes del periodo
  assertPeriodo(periodo);
  const [y, m] = periodo.split("-").map((s) => parseInt(s, 10));
  const lastDay = new Date(y, m, 0);
  const yyyy = lastDay.getFullYear();
  const mm = String(lastDay.getMonth() + 1).padStart(2, "0");
  const dd = String(lastDay.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ------------------------------------------------------
 * Tasas Panamá (2025) + overrides
 * ------------------------------------------------------ */
export interface PanamaRates {
  ssEmpleado: number;         // 9.75 (regular)
  ssEmpleador: number;        // 13.25 (desde 2025-04-01)
  seEmpleado: number;         // 1.25 (regular)
  seEmpleador: number;        // 1.5 (regular)
  ssEmpleadoDecimo: number;   // 7.25 (empleado, solo décimo)
  seAplicaEnDecimo: boolean;  // por defecto EXENTO en décimo
  riesgoProfesional: number;  // % patronal (regular)
  riesgoProfesionalAplicaEnDecimo: boolean; // por defecto false
}

export const DEFAULT_PANAMA_RATES: PanamaRates = {
  ssEmpleado: 9.75,
  ssEmpleador: 13.25,
  seEmpleado: 1.25,
  seEmpleador: 1.5,
  ssEmpleadoDecimo: 7.25,
  seAplicaEnDecimo: false,
  riesgoProfesional: 0,
  riesgoProfesionalAplicaEnDecimo: false,
};

function buildRates(legalParameters?: LegalParameters[]): PanamaRates {
  // Permite override desde parámetros legales activos
  const r = { ...DEFAULT_PANAMA_RATES };
  if (Array.isArray(legalParameters)) {
    const map = new Map<string, number>();
    for (const p of legalParameters) {
      if (p && p.activo) map.set(p.tipo, p.porcentaje);
    }
    r.ssEmpleado = map.get("ss_empleado") ?? r.ssEmpleado;
    r.ssEmpleador = map.get("ss_empleador") ?? r.ssEmpleador;
    r.seEmpleado = map.get("se_empleado") ?? r.seEmpleado;
    r.seEmpleador = map.get("se_empleador") ?? r.seEmpleador;
    r.ssEmpleadoDecimo = map.get("ss_empleado_decimo") ?? r.ssEmpleadoDecimo;
    r.riesgoProfesional = map.get("riesgo_profesional") ?? r.riesgoProfesional;
    // Flags opcionales (usar 1/0 para on/off)
    const seDec = map.get("se_decimo_aplica");
    if (typeof seDec === "number") r.seAplicaEnDecimo = seDec > 0;
    const rpDec = map.get("riesgo_profesional_decimo_aplica");
    if (typeof rpDec === "number") r.riesgoProfesionalAplicaEnDecimo = rpDec > 0;
  }
  return r;
}

/* ------------------------------------------------------
 * ISR Panamá
 * ------------------------------------------------------ */
export function computeISRAnualPanama(baseAnual: number): number {
  // Tramos DGI vigentes: 0–11,000 = 0%; 11,000–50,000 = 15% excedente; >50,000 = 5,850 + 25% excedente
  if (baseAnual <= 11000) return 0;
  if (baseAnual <= 50000) return round((baseAnual - 11000) * 0.15);
  return round(5850 + (baseAnual - 50000) * 0.25);
}

/* ------------------------------------------------------
 * Nómina regular (mensual/quincenal)
 * ------------------------------------------------------ */
export interface PayrollCalculationInput {
  employee: Employee;
  periodo: string;
  tipoPeriodo?: "quincenal" | "mensual";
  horasExtras?: number;
  bonificaciones?: number;
  otrosIngresos?: number;
  otrasRetenciones?: number;
  legalParameters?: LegalParameters[];
}

export interface PayrollCalculationResult {
  periodo: string;
  tipoPeriodo: "quincenal" | "mensual";
  salarioBasePeriodo: number;
  salarioBruto: number;
  seguroSocialEmpleado: number;
  seguroSocialEmpleador: number;
  seguroEducativoEmpleado: number;
  seguroEducativoEmpleador: number;
  riesgoProfesional: number;
  isr: number;
  otrasRetenciones: number;
  salarioNeto: number;
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const {
    employee,
    periodo,
    tipoPeriodo = "mensual",
    horasExtras = 0,
    bonificaciones = 0,
    otrosIngresos = 0,
    otrasRetenciones = 0,
    legalParameters,
  } = input;

  assertPeriodo(periodo);
  const rates = buildRates(legalParameters);

  let salarioBasePeriodo = employee.salarioBase;
  if (tipoPeriodo === "quincenal") salarioBasePeriodo = employee.salarioBase / 2;

  const salarioBruto = round(salarioBasePeriodo + horasExtras + bonificaciones + otrosIngresos);

  const seguroSocialEmpleado = round(salarioBruto * (rates.ssEmpleado / 100));
  const seguroSocialEmpleador = round(salarioBruto * (rates.ssEmpleador / 100));
  const seguroEducativoEmpleado = round(salarioBruto * (rates.seEmpleado / 100));
  const seguroEducativoEmpleador = round(salarioBruto * (rates.seEmpleador / 100));
  const riesgoProfesional = round(salarioBruto * (rates.riesgoProfesional / 100));

  // ISR: anualizado con 13 salarios (12 + décimo) y prorrateado al período
  const isrAnual = computeISRAnualPanama(employee.salarioBase * 13);
  const isrPeriodo = tipoPeriodo === "quincenal" ? round(isrAnual / 24) : round(isrAnual / 12);

  const descuentosEmpleado = round(
    seguroSocialEmpleado + seguroEducativoEmpleado + isrPeriodo + (otrasRetenciones || 0)
  );
  const salarioNeto = round(salarioBruto - descuentosEmpleado);
  console.log(
    periodo,
    tipoPeriodo,
    salarioBasePeriodo,
    salarioBruto,
    seguroSocialEmpleado,
    seguroSocialEmpleador,
    seguroEducativoEmpleado,
    seguroEducativoEmpleador,
    riesgoProfesional,
    otrasRetenciones,
    salarioNeto,
  )
  return {
    periodo,
    tipoPeriodo,
    salarioBasePeriodo: round(salarioBasePeriodo),
    salarioBruto,
    seguroSocialEmpleado,
    seguroSocialEmpleador,
    seguroEducativoEmpleado,
    seguroEducativoEmpleador,
    riesgoProfesional,
    isr: isrPeriodo,
    otrasRetenciones: round(otrasRetenciones || 0),
    salarioNeto,
  };
}

/* ------------------------------------------------------
 * Décimo Tercer Mes (Panamá)
 * ------------------------------------------------------ */
export function computeDecimoBrutoPanama(args: {
  periodo: string;
  payrollEntriesCuatrimestre?: PayrollEntry[]; // ingresos devengados (bruto) de los 4 meses del cuatrimestre
  salarioBaseMensual?: number; // fallback si no hay histórico
}): number {
  const { periodo, payrollEntriesCuatrimestre, salarioBaseMensual = 0 } = args;
  assertPeriodo(periodo);

  if (Array.isArray(payrollEntriesCuatrimestre) && payrollEntriesCuatrimestre.length > 0) {
    const totalCents = payrollEntriesCuatrimestre.reduce(
      (acc, e) => acc + toCents((e as any).salarioBruto ?? 0),
      0
    );
    return fromCents(Math.round(totalCents / 12));
  }
  return round((salarioBaseMensual * 4) / 12);
}

export function computeDecimoDeductionsPanama(args: {
  decimoBruto: number;
  salarioBaseMensual: number;
  legalParameters?: LegalParameters[];
}): {
  ssEmpleadoDecimo: number;
  ssEmpleadorDecimo: number;
  seEmpleadoDecimo: number;
  seEmpleadorDecimo: number;
  isrDecimo: number;
} {
  const rates = buildRates(args.legalParameters);
  const { decimoBruto, salarioBaseMensual } = args;

  const ssEmpleadoDecimo = round(decimoBruto * (rates.ssEmpleadoDecimo / 100));
  const ssEmpleadorDecimo = round(decimoBruto * (rates.ssEmpleador / 100));

  const seEmpleadoDecimo = rates.seAplicaEnDecimo ? round(decimoBruto * (rates.seEmpleado / 100)) : 0;
  const seEmpleadorDecimo = rates.seAplicaEnDecimo ? round(decimoBruto * (rates.seEmpleador / 100)) : 0;

  // ISR sobre décimo por diferencia anual (anual con décimo - anual sin décimo)
  const anualSinDecimo = salarioBaseMensual * 12;
  const anualConDecimo = anualSinDecimo + decimoBruto;
  const isrDecimo = round(
    computeISRAnualPanama(anualConDecimo) - computeISRAnualPanama(anualSinDecimo)
  );

  return { ssEmpleadoDecimo, ssEmpleadorDecimo, seEmpleadoDecimo, seEmpleadorDecimo, isrDecimo };
}

export function calculateDecimoTercerMesWithDeductions(args: {
  employee: Employee;
  periodo: string; // "YYYY-MM" (abril, agosto, diciembre)
  payrollEntriesCuatrimestre?: PayrollEntry[]; // históricos del cuatrimestre del período
  legalParameters?: LegalParameters[];
}): {
  periodo: string;
  isDecimoMonth: boolean;
  decimoBruto: number;
  ssEmpleadoDecimo: number;
  ssEmpleadorDecimo: number;
  seEmpleadoDecimo: number;
  seEmpleadorDecimo: number;
  isrDecimo: number;
  decimoNetoEmpleado: number;
  costoPatronalDecimo: number;
} {
  const { employee, periodo, payrollEntriesCuatrimestre, legalParameters } = args;

  if (!periodo) throw new Error('Falta "periodo" (YYYY-MM) al calcular el décimo.');
  assertPeriodo(periodo);

  const isDec = isDecimoMonth(periodo);
  if (!isDec) {
    return {
      periodo,
      isDecimoMonth: false,
      decimoBruto: 0,
      ssEmpleadoDecimo: 0,
      ssEmpleadorDecimo: 0,
      seEmpleadoDecimo: 0,
      seEmpleadorDecimo: 0,
      isrDecimo: 0,
      decimoNetoEmpleado: 0,
      costoPatronalDecimo: 0,
    };
    }

  const decimoBruto = computeDecimoBrutoPanama({
    periodo,
    payrollEntriesCuatrimestre,
    salarioBaseMensual: employee.salarioBase,
  });

  const {
    ssEmpleadoDecimo,
    ssEmpleadorDecimo,
    seEmpleadoDecimo,
    seEmpleadorDecimo,
    isrDecimo,
  } = computeDecimoDeductionsPanama({
    decimoBruto,
    salarioBaseMensual: employee.salarioBase,
    legalParameters,
  });

  const decimoNetoEmpleado = round(decimoBruto - ssEmpleadoDecimo - seEmpleadoDecimo - isrDecimo);
  const costoPatronalDecimo = round(decimoBruto + ssEmpleadorDecimo + seEmpleadorDecimo);

  return {
    periodo,
    isDecimoMonth: true,
    decimoBruto,
    ssEmpleadoDecimo,
    ssEmpleadorDecimo,
    seEmpleadoDecimo,
    seEmpleadorDecimo,
    isrDecimo,
    decimoNetoEmpleado,
    costoPatronalDecimo,
  };
}

/* ------------------------------------------------------
 * SIPE del período (Caja de Seguro Social)
 * ------------------------------------------------------ */
export interface SIPEPayment {
  periodo: string;
  fechaLimite: string;
  isDecimoMonth: boolean;

  // Totales por aportes regulares del período
  totalSeguroSocialEmpleado: number;
  totalSeguroSocialEmpleador: number;
  totalSeguroEducativoEmpleado: number;
  totalSeguroEducativoEmpleador: number;
  totalRiesgoProfesional: number;

  // Totales del décimo (si aplica en el período)
  totalDecimoBruto: number;
  totalDecimoSS_Empleado: number;
  totalDecimoSS_Empleador: number;
  totalDecimoSE_Empleado: number; // usualmente 0
  totalDecimoSE_Empleador: number; // usualmente 0
  totalDecimoISR: number;

  // ISR total retenido en el período (regular + décimo)
  totalISR: number;

  // Total a pagar a CSS vía SIPE (no incluye ISR)
  totalAPagarCSS: number;

  estado: "pendiente" | "pagado";
}

export function calculateSIPEPayment(args: {
  employee: Employee;
  payrollEntries: PayrollEntry[];
  periodo: string;
  tipoPeriodo?: "quincenal" | "mensual";
  legalParameters?: LegalParameters[];
}): SIPEPayment {
  const { employee, payrollEntries, periodo, tipoPeriodo = "mensual", legalParameters } = args;
  assertPeriodo(periodo);
  const rates = buildRates(legalParameters);
  const decimoFlag = isDecimoMonth(periodo);

  // Entradas confirmadas del período
  const periodEntries = (payrollEntries || []).filter(
    (e) => e.periodo === periodo && e.estado !== "borrador"
  );

  // Si no hay entradas, aproximamos una con salario base
  const entries = periodEntries.length
    ? periodEntries
    : [
        {
          empleadoId: employee.id,
          periodo,
          salarioBruto: tipoPeriodo === "quincenal" ? employee.salarioBase / 2 : employee.salarioBase,
          estado: "confirmado",
        } as PayrollEntry,
      ];

  // Totales regulares
  let ssEmpC = 0, ssPatC = 0, seEmpC = 0, sePatC = 0, rpC = 0;
  for (const entry of entries) {
    const bruto = (entry as any).salarioBruto ?? 0;
    ssEmpC += toCents(bruto * (rates.ssEmpleado / 100));
    ssPatC += toCents(bruto * (rates.ssEmpleador / 100));
    seEmpC += toCents(bruto * (rates.seEmpleado / 100));
    sePatC += toCents(bruto * (rates.seEmpleador / 100));
    rpC += toCents(bruto * (rates.riesgoProfesional / 100));
  }

  // ISR regular prorrateado
  const isrAnual = computeISRAnualPanama(employee.salarioBase * 13);
  const isrPeriodo = tipoPeriodo === "quincenal" ? isrAnual / 24 : isrAnual / 12;
  let totalISR_C = 0;
  for (let i = 0; i < entries.length; i++) totalISR_C += toCents(isrPeriodo);

  // Décimo del período (si aplica)
  let totalDecimoBruto = 0;
  let totalDecimoSS_Empleado = 0;
  let totalDecimoSS_Empleador = 0;
  let totalDecimoSE_Empleado = 0;
  let totalDecimoSE_Empleador = 0;
  let totalDecimoISR_C = 0;

  if (decimoFlag) {
    const decimoBruto = computeDecimoBrutoPanama({
      periodo,
      payrollEntriesCuatrimestre: undefined, // si tienes histórico, pásalo aquí
      salarioBaseMensual: employee.salarioBase,
    });
    const d = computeDecimoDeductionsPanama({
      decimoBruto,
      salarioBaseMensual: employee.salarioBase,
      legalParameters,
    });

    totalDecimoBruto += decimoBruto;
    totalDecimoSS_Empleado += d.ssEmpleadoDecimo;
    totalDecimoSS_Empleador += d.ssEmpleadorDecimo;
    totalDecimoSE_Empleado += d.seEmpleadoDecimo;   // usualmente 0
    totalDecimoSE_Empleador += d.seEmpleadorDecimo; // usualmente 0
    totalDecimoISR_C += toCents(d.isrDecimo);
  }

  const totalSeguroSocialEmpleado = fromCents(ssEmpC);
  const totalSeguroSocialEmpleador = fromCents(ssPatC);
  const totalSeguroEducativoEmpleado = fromCents(seEmpC);
  const totalSeguroEducativoEmpleador = fromCents(sePatC);
  const totalRiesgoProfesional = fromCents(rpC);
  const totalISR = fromCents(totalISR_C + totalDecimoISR_C);

  // Total a pagar a CSS por SIPE (no incluye ISR): patronales + riesgo + SS patronal de décimo
  const totalAPagarCSS = round(
    totalSeguroSocialEmpleador +
    totalSeguroEducativoEmpleador +
    totalRiesgoProfesional +
    totalDecimoSS_Empleador +
    totalDecimoSE_Empleador // usualmente 0
  );

  return {
    periodo,
    fechaLimite: calculateSIPEPaymentDate(periodo),
    isDecimoMonth: decimoFlag,
    totalSeguroSocialEmpleado: round(totalSeguroSocialEmpleado),
    totalSeguroSocialEmpleador: round(totalSeguroSocialEmpleador),
    totalSeguroEducativoEmpleado: round(totalSeguroEducativoEmpleado),
    totalSeguroEducativoEmpleador: round(totalSeguroEducativoEmpleador),
    totalRiesgoProfesional: round(totalRiesgoProfesional),
    totalDecimoBruto: round(totalDecimoBruto),
    totalDecimoSS_Empleado: round(totalDecimoSS_Empleado),
    totalDecimoSS_Empleador: round(totalDecimoSS_Empleador),
    totalDecimoSE_Empleado: round(totalDecimoSE_Empleado),
    totalDecimoSE_Empleador: round(totalDecimoSE_Empleador),
    totalDecimoISR: round(fromCents(totalDecimoISR_C)),
    totalISR: round(totalISR),
    totalAPagarCSS,
    estado: "pendiente",
  };
}

/* ------------------------------------------------------
 * BACKCOMPAT: Aliases y totales de empresa
 * ------------------------------------------------------ */

// Aliases "legacy" para no romper UI existentes: añade totalAPagar y renombres de campos del décimo.
export function calculateSIPEPaymentWithLegacyAliases(args: Parameters<typeof calculateSIPEPayment>[0]) {
  const r = calculateSIPEPayment(args);

  // Aliases "legacy":
  const totalDecimoEmpleado = r.totalDecimoSS_Empleado;    // antes: totalDecimoEmpleado
  const totalDecimoPatrono  = r.totalDecimoSS_Empleador;   // antes: totalDecimoPatrono
  const totalDecimoISR      = r.totalDecimoISR;            // mismo significado

  // totalAPagar "legacy" (NO es el pago real a CSS; se conserva solo para UI que lo espera):
  const totalAPagar = round(
    r.totalAPagarCSS +
    r.totalSeguroSocialEmpleado +
    r.totalSeguroEducativoEmpleado +
    r.totalISR
  );

  return {
    ...r,
    totalDecimoEmpleado,
    totalDecimoPatrono,
    totalDecimoISR,
    totalAPagar,            // alias legacy
  };
}

// Totales de empresa (itera por empleados y suma), emulando el alcance del archivo original.
export function calculateSIPEPaymentCompany(args: {
  employees: Employee[];
  payrollEntries: PayrollEntry[];
  periodo: string;
  tipoPeriodo?: "quincenal" | "mensual";
  legalParameters?: LegalParameters[];
}) {
  const { employees, payrollEntries, periodo, tipoPeriodo = "mensual", legalParameters } = args;
  assertPeriodo(periodo);

  // Acumuladores
  let acc = {
    totalSeguroSocialEmpleado: 0,
    totalSeguroSocialEmpleador: 0,
    totalSeguroEducativoEmpleado: 0,
    totalSeguroEducativoEmpleador: 0,
    totalRiesgoProfesional: 0,
    totalDecimoBruto: 0,
    totalDecimoSS_Empleado: 0,
    totalDecimoSS_Empleador: 0,
    totalDecimoSE_Empleado: 0,
    totalDecimoSE_Empleador: 0,
    totalDecimoISR: 0,
    totalISR: 0,
  };

  for (const emp of employees) {
    const empEntries = payrollEntries.filter(e => e.empleadoId === emp.id);
    const r = calculateSIPEPayment({
      employee: emp,
      payrollEntries: empEntries,
      periodo,
      tipoPeriodo,
      legalParameters,
    });

    acc.totalSeguroSocialEmpleado     += r.totalSeguroSocialEmpleado;
    acc.totalSeguroSocialEmpleador    += r.totalSeguroSocialEmpleador;
    acc.totalSeguroEducativoEmpleado  += r.totalSeguroEducativoEmpleado;
    acc.totalSeguroEducativoEmpleador += r.totalSeguroEducativoEmpleador;
    acc.totalRiesgoProfesional        += r.totalRiesgoProfesional;
    acc.totalDecimoBruto              += r.totalDecimoBruto;
    acc.totalDecimoSS_Empleado        += r.totalDecimoSS_Empleado;
    acc.totalDecimoSS_Empleador       += r.totalDecimoSS_Empleador;
    acc.totalDecimoSE_Empleado        += r.totalDecimoSE_Empleado;
    acc.totalDecimoSE_Empleador       += r.totalDecimoSE_Empleador;
    acc.totalDecimoISR                += r.totalDecimoISR;
    acc.totalISR                      += r.totalISR;
  }

  // Pago real a CSS:
  const totalAPagarCSS = round(
    acc.totalSeguroSocialEmpleador +
    acc.totalSeguroEducativoEmpleador +
    acc.totalRiesgoProfesional +
    acc.totalDecimoSS_Empleador +
    acc.totalDecimoSE_Empleador
  );

  // Aliases legacy para seguir mostrando "como antes"
  const totalDecimoEmpleado = acc.totalDecimoSS_Empleado;
  const totalDecimoPatrono  = acc.totalDecimoSS_Empleador;
  const totalDecimoISR      = acc.totalDecimoISR;

  const totalAPagar = round(
    totalAPagarCSS +
    acc.totalSeguroSocialEmpleado +
    acc.totalSeguroEducativoEmpleado +
    acc.totalISR
  );

  return {
    periodo,
    fechaLimite: calculateSIPEPaymentDate(periodo),
    isDecimoMonth: isDecimoMonth(periodo),

    totalSeguroSocialEmpleado: round(acc.totalSeguroSocialEmpleado),
    totalSeguroSocialEmpleador: round(acc.totalSeguroSocialEmpleador),
    totalSeguroEducativoEmpleado: round(acc.totalSeguroEducativoEmpleado),
    totalSeguroEducativoEmpleador: round(acc.totalSeguroEducativoEmpleador),
    totalRiesgoProfesional: round(acc.totalRiesgoProfesional),

    totalDecimoBruto: round(acc.totalDecimoBruto),
    totalDecimoSS_Empleado: round(acc.totalDecimoSS_Empleado),
    totalDecimoSS_Empleador: round(acc.totalDecimoSS_Empleador),
    totalDecimoSE_Empleado: round(acc.totalDecimoSE_Empleado),
    totalDecimoSE_Empleador: round(acc.totalDecimoSE_Empleador),
    totalDecimoISR: round(acc.totalDecimoISR),

    totalISR: round(acc.totalISR),

    // Campos “legacy” además del campo correcto a CSS:
    totalDecimoEmpleado: round(totalDecimoEmpleado),
    totalDecimoPatrono: round(totalDecimoPatrono),
    totalAPagar,     // legacy (no es pago real CSS)
    totalAPagarCSS,  // pago real a CSS

    estado: "pendiente" as const,
  };
}
