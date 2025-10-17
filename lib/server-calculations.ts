// File: lib/server-calculations.ts

import type { Employee, LegalParameters, ISRBracket, PayrollEntry, EmployeeDeduction } from "./types"

const round = (num: number) => Math.round(num * 100) / 100

export interface PayrollCalculationInput {
  employee: Employee
  periodo: string
  tipoPeriodo?: "quincenal" | "mensual"
  horasExtras?: number
  bonificaciones?: number
  otrosIngresos?: number
  otrasRetenciones?: number
  legalParameters: LegalParameters[]
  isrBrackets: ISRBracket[]
}

export interface PayrollCalculationResult {
  salarioBruto: number
  seguroSocialEmpleado: number
  seguroEducativo: number
  isr: number
  deduccionesBancarias: number
  prestamos: number
  otrasDeduccionesPersonalizadas: number
  otrasRetenciones: number
  totalDeducciones: number
  salarioNeto: number
  seguroSocialEmpleador: number
  seguroEducativoEmpleador: number
  riesgoProfesional: number
  fondoCesantia: number
}

// ===============================================
// ISR Helper
// ===============================================

export function calculateISR(salarioAnual: number): { isr: number; tasa: string } {
  let isr = 0
  let tasa = "0%"

  if (salarioAnual <= 11000) {
    isr = 0
    tasa = "0% (Exento)"
  } else if (salarioAnual <= 50000) {
    isr = ((salarioAnual - 11000) * 15) / 100
    tasa = "15%"
  } else {
    isr = 5850 + ((salarioAnual - 50000) * 25) / 100
    tasa = "15% + 25%"
  }

  return { isr: round(isr), tasa }
}


// ===============================================
// Planilla Calculation
// ===============================================

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const {
    employee,
    periodo,
    tipoPeriodo = "quincenal",
    horasExtras = 0,
    bonificaciones = 0,
    otrosIngresos = 0,
    otrasRetenciones = 0,
    legalParameters,
  } = input

  const currentMonth = Number.parseInt(periodo.split("-")[1])

  let salarioBasePeriodo = employee.salarioBase
  if (tipoPeriodo === "quincenal") {
    salarioBasePeriodo = employee.salarioBase / 2
  }

  const salarioBruto = round(salarioBasePeriodo + horasExtras + bonificaciones + otrosIngresos)

  const getRate = (type: string, fallback: number) =>
    legalParameters.find((p) => p.tipo === type && p.activo)?.porcentaje || fallback

  const seguroSocialEmpleadoRate = getRate("seguro_social_empleado", 9.75)
  const seguroSocialEmpleadorRate = getRate("seguro_social_empleador", 13.25)
  const seguroEducativoRate = getRate("seguro_educativo", 1.25)
  const seguroEducativoEmpleadorRate = getRate("seguro_educativo_empleador", 1.5)
  const riesgoProfesionalRate = getRate("riesgo_profesional", 0.98)
  const fondoCesantiaRate = 2.25 // Asumiendo 2.25% fijo para cesantía

  // Aportes de Empleado (Deducciones)
  const seguroSocialEmpleado = round((salarioBruto * seguroSocialEmpleadoRate) / 100)
  const seguroEducativo = round((salarioBruto * seguroEducativoRate) / 100)

  // ISR Calculation
  const salarioMensual = employee.salarioBase
  const salarioAnual = salarioMensual * 13 
  const { isr: isrAnual } = calculateISR(salarioAnual)
  let isr = round(isrAnual / 13)
  if (tipoPeriodo === "quincenal") {
    isr = round(isrAnual / 26)
  }
  
  // Deducciones Personales
  const isMonthApplicable = (months?: number[]) =>
    !months || months.length === 0 || months.includes(currentMonth)

  let deduccionesBancarias = 0
  if (isMonthApplicable(employee.mesesDeduccionesBancarias)) {
      deduccionesBancarias = employee.deduccionesBancarias || 0
      if (tipoPeriodo === "quincenal") {
          deduccionesBancarias = round(deduccionesBancarias / 2)
      }
  }

  let prestamos = 0
  if (isMonthApplicable(employee.mesesPrestamos)) {
      prestamos = employee.prestamos || 0
      if (tipoPeriodo === "quincenal") {
          prestamos = round(prestamos / 2)
      }
  }

  let otrasDeduccionesPersonalizadas = 0
  const employeeDeductions = (employee.otrasDeduccionesPersonalizadas || []) as EmployeeDeduction[]

  if (employeeDeductions.length > 0) {
    otrasDeduccionesPersonalizadas = round(
      employeeDeductions
        .filter((d) => {
          if (!d.activo) return false
          if (!d.mesesAplicacion || d.mesesAplicacion.length === 0) return true
          return d.mesesAplicacion.includes(currentMonth)
        })
        .reduce((sum, d) => {
          let monto = 0
          if (d.tipo === "fijo") {
            monto = d.monto
          } else {
            monto = (salarioBasePeriodo * d.monto) / 100
          }
          return sum + monto
        }, 0),
    )
  }
  
  const totalDeducciones = round(
    seguroSocialEmpleado +
      seguroEducativo +
      isr +
      deduccionesBancarias +
      prestamos +
      otrasDeduccionesPersonalizadas +
      otrasRetenciones,
  )

  const salarioNeto = round(salarioBruto - totalDeducciones)

  // Costos Patronales
  const seguroSocialEmpleador = round((salarioBruto * seguroSocialEmpleadorRate) / 100)
  const seguroEducativoEmpleador = round((salarioBruto * seguroEducativoEmpleadorRate) / 100)
  const riesgoProfesional = round((salarioBruto * riesgoProfesionalRate) / 100)
  const fondoCesantia = round((salarioBruto * fondoCesantiaRate) / 100)

  return {
    salarioBruto,
    seguroSocialEmpleado,
    seguroEducativo,
    isr,
    deduccionesBancarias,
    prestamos,
    otrasDeduccionesPersonalizadas,
    otrasRetenciones,
    totalDeducciones,
    salarioNeto,
    seguroSocialEmpleador,
    seguroEducativoEmpleador,
    riesgoProfesional,
    fondoCesantia,
  }
}

// ===============================================
// Decimo Calculation
// ===============================================

export function calculateDecimoTercerMesWithDeductions(
  employee: Employee,
  payrollEntries: PayrollEntry[],
  year: number,
  legalParameters: LegalParameters[],
  isrBrackets: ISRBracket[],
): {
  salarioPromedio: number
  mesesTrabajados: number
  montoTotal: number
  css: number
  cssPatrono: number
  isr: number
  totalDeducciones: number
  totalAportesPatronales: number
  montoNeto: number
  pagoAbril: number
  pagoAgosto: number
  pagoDiciembre: number
  mesesDetalle: string[]
} {
  const round = (num: number) => Math.round(num * 100) / 100

  const yearEntries = payrollEntries.filter((entry) => {
    const entryYear = new Date(entry.fechaCalculo).getFullYear()
    return entry.empleadoId === employee.id && entryYear === year && entry.estado !== "borrador"
  })

  let mesesTrabajados = 0
  let salarioPromedio = employee.salarioBase
  let totalIngresos = 0
  let mesesDetalle: string[] = []
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  if (yearEntries.length > 0) {
    const uniqueMonths = new Set(yearEntries.map((entry) => entry.periodo.slice(0, 7))) 
    mesesTrabajados = uniqueMonths.size
    totalIngresos = yearEntries.reduce((sum, entry) => sum + entry.salarioBruto, 0)
    salarioPromedio = totalIngresos / mesesTrabajados

    mesesDetalle = Array.from(uniqueMonths).map((periodo) => {
      const month = Number.parseInt(periodo.split("-")[1])
      return monthNames[month - 1]
    })
  } else {
    const hireDate = new Date(employee.fechaIngreso)
    const hireYear = hireDate.getFullYear()

    if (hireYear === year) {
      const hireMonth = hireDate.getMonth()
      mesesTrabajados = 12 - hireMonth
    } else if (hireYear < year) {
      mesesTrabajados = 12
    } else {
      mesesTrabajados = 0
    }
    
    totalIngresos = employee.salarioBase * mesesTrabajados
    salarioPromedio = employee.salarioBase

    if (mesesTrabajados > 0) {
      const startMonth = hireYear === year ? hireDate.getMonth() : 0;
      for (let i = startMonth; i < 12; i++) {
        mesesDetalle.push(monthNames[i]);
      }
    }
  }


  const montoTotal = round((totalIngresos * 4) / 12)

  // Deducciones
  const css = round((montoTotal * 7.25) / 100) 
  const cssPatrono = round((montoTotal * 10.75) / 100)

  const salarioAnualBase = employee.salarioBase * 13 
  const { isr: isrAnual } = calculateISR(salarioAnualBase)
  const isr = round(isrAnual / 13) // Se deduce 1/13 del ISR anual

  const totalDeducciones = round(css + isr)
  const totalAportesPatronales = round(cssPatrono)
  const montoNeto = round(montoTotal - totalDeducciones)

  const pagoAbril = round(montoNeto / 3)
  const pagoAgosto = round(montoNeto / 3)
  const pagoDiciembre = round(montoNeto - pagoAbril - pagoAgosto) // Asegura que no haya errores de redondeo

  return {
    salarioPromedio: round(salarioPromedio),
    mesesTrabajados,
    montoTotal,
    css,
    cssPatrono,
    isr,
    totalDeducciones,
    totalAportesPatronales,
    montoNeto,
    pagoAbril,
    pagoAgosto,
    pagoDiciembre,
    mesesDetalle,
  }
}
// Las funciones calculateSIPEPaymentDate y calculateSIPEPayment permanecen en el servidor
// y se usarán en la API de SIPE.

export function calculateSIPEPaymentDate(periodo: string): string {
  const [year, month] = periodo.split("-").map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-15`
}

export function calculateSIPEPayment(
  payrollEntries: PayrollEntry[],
  periodo: string,
  allEmployees: Employee[],
  legalParameters: LegalParameters[],
) {
  const round = (num: number) => Math.round(num * 100) / 100

  const [year, month] = periodo.split("-").map(Number)
  const isDecimoMonth = month === 4 || month === 8 || month === 12 

  const periodEntries = payrollEntries.filter((e) => e.periodo.startsWith(periodo))
  
  let totalSeguroSocialEmpleado = 0
  let totalSeguroSocialEmpleador = 0
  let totalSeguroEducativoEmpleado = 0
  let totalSeguroEducativoEmpleador = 0
  let totalRiesgoProfesional = 0
  let totalISR = 0

  const getRate = (type: string, fallback: number) =>
    legalParameters.find((p) => p.tipo === type && p.activo)?.porcentaje || fallback

  const seguroSocialEmpleadoRate = getRate("seguro_social_empleado", 9.75)
  const seguroSocialEmpleadorRate = getRate("seguro_social_empleador", 13.25)
  const seguroEducativoRate = getRate("seguro_educativo", 1.25)
  const seguroEducativoEmpleadorRate = getRate("seguro_educativo_empleador", 1.5)
  const riesgoProfesionalRate = getRate("riesgo_profesional", 0.98)


  for (const employee of allEmployees) {
    const salarioBase = employee.salarioBase; 

    // Aportes Mensuales Regulares
    totalSeguroSocialEmpleado += round((salarioBase * seguroSocialEmpleadoRate) / 100)
    totalSeguroSocialEmpleador += round((salarioBase * seguroSocialEmpleadorRate) / 100)
    totalSeguroEducativoEmpleado += round((salarioBase * seguroEducativoRate) / 100)
    totalSeguroEducativoEmpleador += round((salarioBase * seguroEducativoEmpleadorRate) / 100)
    totalRiesgoProfesional += round((salarioBase * riesgoProfesionalRate) / 100)

    // ISR Mensual
    const salarioAnual = salarioBase * 13
    const { isr: isrAnual } = calculateISR(salarioAnual)
    const isrMensual = round(isrAnual / 13)
    totalISR += isrMensual
  }

  // Deducciones del Décimo Tercer Mes (SOLO si es un mes de pago)
  if (isDecimoMonth) {
    let totalDecimoCSS = 0;
    let totalDecimoISR = 0;
    for (const employee of allEmployees) {
      const decimoCalc = calculateDecimoTercerMesWithDeductions(
          employee,
          periodEntries, // Usamos periodEntries como un proxy para la data de salarios
          year,
          legalParameters,
          []
      )
      
      // La parte del CSS y el ISR que se pagan en este mes por el décimo
      totalDecimoCSS += decimoCalc.css + decimoCalc.cssPatrono;
      totalDecimoISR += decimoCalc.isr;
    }
    
    // Sumar los totales del décimo al total mensual
    totalSeguroSocialEmpleado = round(totalSeguroSocialEmpleado + round(totalDecimoCSS / 2));
    totalSeguroSocialEmpleador = round(totalSeguroSocialEmpleador + round(totalDecimoCSS / 2));
    totalISR = round(totalISR + totalDecimoISR)
  }

  const totalAPagar = round(
    totalSeguroSocialEmpleado +
      totalSeguroSocialEmpleador +
      totalSeguroEducativoEmpleado +
      totalSeguroEducativoEmpleador +
      totalRiesgoProfesional +
      totalISR,
  )

  return {
    periodo,
    fechaLimite: calculateSIPEPaymentDate(periodo),
    totalSeguroSocialEmpleado: round(totalSeguroSocialEmpleado),
    totalSeguroSocialEmpleador: round(totalSeguroSocialEmpleador),
    totalSeguroEducativoEmpleado: round(totalSeguroEducativoEmpleado),
    totalSeguroEducativoEmpleador: round(totalSeguroEducativoEmpleador),
    totalRiesgoProfesional: round(totalRiesgoProfesional),
    totalISR: round(totalISR),
    totalAPagar,
    estado: "pendiente" as const,
  }
}