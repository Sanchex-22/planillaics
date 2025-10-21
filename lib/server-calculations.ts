// File: lib/server-calculations.ts
// Drop-in enhanced version with Décimo Tercer Mes integration and safer money ops.

import type {
    Employee,
    LegalParameters,
    ISRBracket,
    PayrollEntry,
    EmployeeDeduction,
} from "@/lib/types"

// ---------- Money helpers (cent-based) ----------
const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;
const addC = (...vals: number[]) => vals.map(toCents).reduce((a, b) => a + b, 0);
const sumC = (arr: number[]) => arr.map(toCents).reduce((a, b) => a + b, 0);
// Calcula porcentaje y redondea a centavos
const pctC = (base: number, pct: number) => Math.round(toCents(base) * (pct / 100)); 

// Keep a 2-decimal rounding helper for presentation only
const round2 = (num: number) => Math.round(num * 100) / 100;

// ---------- Types (Actualizados) ----------
export type TipoPeriodo = "quincenal" | "mensual";
export type TipoPlanilla = "regular" | "decimo";

export interface PayrollCalculationInput {
    employee: Employee;
    periodo: string; 
    tipoPeriodo?: TipoPeriodo;
    tipoPlanilla?: TipoPlanilla; // NUEVO: "regular" (default) o "decimo"
    horasExtras?: number;
    bonificaciones?: number;
    otrosIngresos?: number;
    otrasRetenciones?: number;
    legalParameters: LegalParameters[];
    isrBrackets: ISRBracket[];
    deductions?: EmployeeDeduction[]; 
}

export interface PayrollCalculationResult {
    periodo: string;
    fechaLimite: string; 
    totalSeguroSocialEmpleado: number;
    totalSeguroSocialEmpleador: number;
    totalSeguroEducativoEmpleado: number;
    totalSeguroEducativoEmpleador: number;
    totalRiesgoProfesional: number;
    totalISR: number;
    totalAPagar: number; 
    estado: "pendiente" | "emitida" | "pagada";
    salarioBruto?: number;
    desglose?: Array<{
        codigo: string;
        descripcion: string;
        monto: number;
        integraSS: boolean;
        integraSE: boolean;
        integraISR: boolean;
    }>;
    decimo?: {
        periodoCuatroMeses: string; 
        ingresosPeriodo: number;
        montoDecimo: number;
        partida: "abril" | "agosto" | "diciembre";
        // DTM Specific Deductions (para usar en el frontend de forma precisa)
        cssEmpleadoDecimo: number;
        isrDecimo: number;
    }
}

// ---------- Utilities ----------

function assert<T>(cond: T, msg: string): asserts cond {
    if (!cond) throw new Error(msg);
}

function pickParamsForPeriod(legalParams: LegalParameters[], periodo: string): LegalParameters {
    assert(legalParams && legalParams.length > 0, "No legal parameters provided");
    return legalParams[legalParams.length - 1]; // Naive pick: last item.
}

function calculateSIPEPaymentDate(periodo: string): string {
    try {
        const [y, m] = periodo.split("-").map(Number);
        // SIPE date calculation logic (e.g., 15th of next month)
        const nextMonthDate = new Date(y, m, 15);
        const yyyy = nextMonthDate.getFullYear();
        const mm = String(nextMonthDate.getMonth() + 1).padStart(2, "0");
        const dd = String(nextMonthDate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    } catch {
        return `${periodo}-01-01`;
    }
}

function partidaDecimoDesdePeriodo(periodo: string): "abril" | "agosto" | "diciembre" {
    const m = Number(periodo.split("-")[1] || new Date().getMonth() + 1);
    // 15 de Abril: cubre 16/Dic - 15/Abr (Meses 12, 1, 2, 3, 4) - El pago se emite en el mes 4
    if (m === 4) return "abril";
    // 15 de Agosto: cubre 16/Abr - 15/Ago (Meses 4, 5, 6, 7, 8) - El pago se emite en el mes 8
    if (m === 8) return "agosto";
    // 15 de Diciembre: cubre 16/Ago - 15/Dic (Meses 8, 9, 10, 11, 12) - El pago se emite en el mes 12
    if (m === 12) return "diciembre";
    throw new Error("El cálculo de décimo debe ejecutarse en los meses de pago (04, 08 o 12).");
}

function etiquetaPeriodoCuatroMeses(periodo: string): string {
    const [yy] = periodo.split("-").map(Number);
    const block = partidaDecimoDesdePeriodo(periodo);
    switch (block) {
        case "abril":
            // 16 de Diciembre del año anterior hasta el 15 de Abril del año actual
            return `${yy - 1}-12-16 a ${yy}-04-15`;
        case "agosto":
            // 16 de Abril a 15 de Agosto
            return `${yy}-04-16 a ${yy}-08-15`;
        case "diciembre":
            // 16 de Agosto a 15 de Diciembre
            return `${yy}-08-16 a ${yy}-12-15`;
        default:
            return "Período no definido";
    }
}

// ---------- Core calculations ----------

function calcularISR(baseImponible: number, tramos: ISRBracket[]): number {
    if (!baseImponible || baseImponible <= 0) return 0;

    let isrAnual = 0;
    // Asumiendo los tramos panameños
    if (baseImponible <= 11000) {
        isrAnual = 0;
    } else if (baseImponible <= 50000) {
        isrAnual = ((baseImponible - 11000) * 15) / 100;
    } else {
        isrAnual = 5850 + ((baseImponible - 50000) * 25) / 100;
    }
    
    return round2(isrAnual); 
}

function calcularAportes(
    baseSS: number,
    baseSE: number,
    params: LegalParameters
): {
    ssEmpleado: number;
    ssEmpleador: number;
    seEmpleado: number;
    seEmpleador: number;
    riesgoProfesional: number;
    fondoCesantia?: number;
} {
    // Usar tasas provistas o defaults
    const ssEmpRate = (params as any)?.seguroSocialEmpleadoRate ?? 9.75; 
    const ssErRate = (params as any)?.seguroSocialEmpleadorRate ?? 13.25; 
    const seEmpRate = (params as any)?.seguroEducativoEmpleadoRate ?? 1.25; 
    const seErRate = (params as any)?.seguroEducativoEmpleadorRate ?? 1.50; 
    const riesgoRate = (params as any)?.riesgoProfesionalRate ?? 0.98; 
    const cesantiaRate = (params as any)?.fondoCesantiaRate ?? 2.25; 

    const ssEmp = pctC(baseSS, ssEmpRate);
    const ssEr = pctC(baseSS, ssErRate);
    const seEmp = pctC(baseSE, seEmpRate);
    const seEr = pctC(baseSE, seErRate);
    const riesgo = pctC(baseSS, riesgoRate);
    const cesantia = cesantiaRate ? pctC(baseSS, cesantiaRate) : 0;

    return {
        ssEmpleado: fromCents(ssEmp),
        ssEmpleador: fromCents(ssEr),
        seEmpleado: fromCents(seEmp),
        seEmpleador: fromCents(seEr),
        riesgoProfesional: fromCents(riesgo),
        ...(cesantia ? { fondoCesantia: fromCents(cesantia) } : {}),
    };
}

// ---------- Public API - Planilla Regular ----------

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
        isrBrackets,
        deductions = [],
    } = input;

    const params = pickParamsForPeriod(legalParameters, periodo);
    
    const salarioBase = (employee as any)?.salarioBase ?? 0;
    const salarioBasePeriodo = tipoPeriodo === "quincenal" ? salarioBase / 2 : salarioBase;
    const currentMonth = Number(periodo.split("-")[1]);

    type DeductionWithMonths = EmployeeDeduction & { mesesAplicacion?: number[] };
    
    const conceptos = [
        { codigo: "SALARIO_BASE", descripcion: "Salario base", monto: salarioBasePeriodo, integraSS: true, integraSE: true, integraISR: true },
        { codigo: "HORAS_EXTRA", descripcion: "Horas extra", monto: horasExtras, integraSS: true, integraSE: true, integraISR: true },
        { codigo: "BONO", descripcion: "Bonificaciones", monto: bonificaciones, integraSS: true, integraSE: true, integraISR: true },
        { codigo: "OTROS", descripcion: "Otros ingresos", monto: otrosIngresos, integraSS: true, integraSE: true, integraISR: true },
    ].filter(c => c.monto > 0) as PayrollCalculationResult["desglose"];

    const bruto = conceptos!.reduce((s, c) => s + c.monto, 0);
    const baseSS = conceptos!.filter(c => c.integraSS).reduce((s, c) => s + c.monto, 0);
    const baseSE = conceptos!.filter(c => c.integraSE).reduce((s, c) => s + c.monto, 0);
    
    const aportes = calcularAportes(baseSS, baseSE, params);

    // El cálculo de ISR aquí asume 13 pagos al año, 12 salarios + 1 DTM completo
    const salarioAnual = salarioBase * 12; // Se usa 12 para base, el DTM se calcula aparte.
    const isrAnual = calcularISR(salarioAnual, isrBrackets);
    let isr = isrAnual / (tipoPeriodo === "quincenal" ? 24 : 12); // Dividido entre 12 pagos (mensual) o 24 (quincenal)
    
    const aplican = (deductions as DeductionWithMonths[]).filter(d => {
        if (!d.activo) return false;
        if (!d.mesesAplicacion || d.mesesAplicacion.length === 0) return true;
        return d.mesesAplicacion.includes(currentMonth);
    });
    const otrasDeduccionesEmp = aplican.reduce((s, d) => s + (d.monto ?? 0), 0);

    const deduccionesEmpleadoCents = addC(
        aportes.ssEmpleado,
        aportes.seEmpleado,
        isr, 
        otrasRetenciones,
        otrasDeduccionesEmp
    );
    const totalAPagar = fromCents(toCents(bruto) - deduccionesEmpleadoCents);

    return {
        periodo,
        fechaLimite: calculateSIPEPaymentDate(periodo),
        totalSeguroSocialEmpleado: round2(aportes.ssEmpleado),
        totalSeguroSocialEmpleador: round2(aportes.ssEmpleador),
        totalSeguroEducativoEmpleado: round2(aportes.seEmpleado),
        totalSeguroEducativoEmpleador: round2(aportes.seEmpleador),
        totalRiesgoProfesional: round2(aportes.riesgoProfesional),
        totalISR: round2(isr),
        totalAPagar: round2(totalAPagar),
        estado: "pendiente",
        salarioBruto: round2(bruto),
        desglose: conceptos!.map(c => ({ ...c, monto: round2(c.monto) })),
    };
}

// ---------- Public API - Décimo Tercer Mes (DTM) ----------

export function calculateDecimo(input: Omit<PayrollCalculationInput, "tipoPlanilla"> & {
    ingresosPeriodo?: number; 
}): PayrollCalculationResult {
    const {
        periodo,
        legalParameters,
        isrBrackets,
        ingresosPeriodo,
    } = input;

    const params = pickParamsForPeriod(legalParameters, periodo);
    const salarioBase = (input.employee as any)?.salarioBase ?? 0;
    
    // El cálculo del DTM debe hacerse SOLO en los meses de pago (04, 08, 12)
    const partida = partidaDecimoDesdePeriodo(periodo);

    // 1. Cálculo del Monto Bruto de la Partida (Ingresos del período de 4 meses / 12)
    let ingresos = ingresosPeriodo;
    if (ingresos == null) {
        // Usamos salario base * 4 como proxy (requiere data real de 4 meses)
        ingresos = salarioBase * 4; 
    }
    // CORRECCIÓN CLAVE: Fórmula legal panameña: Ingresos del período / 12
    const montoDecimo = (ingresos ?? 0) / 12; 

    // 2. Bases y Aportes
    const baseCSSDecimo = montoDecimo; 
    const baseSEDecimo = 0; // SE no aplica al Décimo

    // Tasas del Décimo (CSS Emp 7.25%, CSS Patr 10.75%, SE 0%)
    const aportesDecimo = calcularAportes(baseCSSDecimo, baseSEDecimo, {
        ...params,
        seguroSocialEmpleadoRate: 7.25, 
        seguroSocialEmpleadorRate: 10.75,
        seguroEducativoEmpleadoRate: 0, 
        seguroEducativoEmpleadorRate: 0, 
    } as LegalParameters);
    
    // 3. ISR (El DTM se grava como 1/12 de la retención anual, no 1/13. Fuente: DGI, Pan.)
    // La base para el ISR es el salario anual normal (sin DTM).
    const isrAnual = calcularISR(salarioBase * 12, isrBrackets); 
    const isr = isrAnual / 12; // 1/12 del ISR anual se aplica a la partida de DTM.

    // 4. Total Neto
    const deduccionesEmpleadoCents = addC(
        aportesDecimo.ssEmpleado, // CSS Empleado (7.25%)
        isr // ISR (1/12)
    );
    const totalNeto = fromCents(toCents(montoDecimo) - deduccionesEmpleadoCents);
    
    // 5. Desglose
    const desgloseDecimo = [
        { codigo: "DECIMO_TERCER_MES", descripcion: `Décimo ${partida}`, monto: montoDecimo, integraSS: true, integraSE: false, integraISR: true },
    ] as PayrollCalculationResult["desglose"];

    return {
        periodo,
        fechaLimite: `${periodo.split("-")[0]}-${partida === "abril" ? "04" : partida === "agosto" ? "08" : "12"}-15`,
        totalSeguroSocialEmpleado: round2(aportesDecimo.ssEmpleado), // CSS EMPLEADO DTM
        totalSeguroSocialEmpleador: round2(aportesDecimo.ssEmpleador), // CSS EMPLEADOR DTM
        totalSeguroEducativoEmpleado: round2(0),
        totalSeguroEducativoEmpleador: round2(0),
        totalRiesgoProfesional: round2(aportesDecimo.riesgoProfesional),
        totalISR: round2(isr),
        totalAPagar: round2(totalNeto),
        estado: "pendiente",
        salarioBruto: round2(montoDecimo),
        desglose: desgloseDecimo?.map(c => ({ ...c, monto: round2(c.monto) })),
        decimo: {
            periodoCuatroMeses: etiquetaPeriodoCuatroMeses(periodo),
            ingresosPeriodo: round2(ingresos ?? 0),
            montoDecimo: round2(montoDecimo),
            partida,
            cssEmpleadoDecimo: round2(aportesDecimo.ssEmpleado),
            isrDecimo: round2(isr),
        }
    };
}

// Unified selector
export function calculate(input: PayrollCalculationInput): PayrollCalculationResult {
    if (input.tipoPlanilla === "decimo") {
        return calculateDecimo(input as any);
    }
    return calculatePayroll(input);
}