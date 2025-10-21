import type { Employee, LegalParameters, ISRBracket, PayrollEntry } from "./types"

// La interfaz PayrollCalculationInput se mantiene igual
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

// La interfaz PayrollCalculationResult se mantiene igual
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
}

// La función calculatePayroll se mantiene igual (calcula planilla regular)
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
    isrBrackets,
  } = input

  const round = (num: number) => Math.round(num * 100) / 100

  const currentMonth = Number.parseInt(periodo.split("-")[1])

  let salarioBasePeriodo = employee.salarioBase
  if (tipoPeriodo === "quincenal") {
    salarioBasePeriodo = employee.salarioBase / 2
  }

  const salarioBruto = round(salarioBasePeriodo + horasExtras + bonificaciones + otrosIngresos)

  const seguroSocialEmpleadoRate =
    legalParameters.find((p) => p.tipo === "seguro_social_empleado" && p.activo)?.porcentaje || 9.75
  const seguroSocialEmpleadorRate =
    legalParameters.find((p) => p.tipo === "seguro_social_empleador" && p.activo)?.porcentaje || 13.25
  const seguroEducativoRate = legalParameters.find((p) => p.tipo === "seguro_educativo" && p.activo)?.porcentaje || 1.25
  const seguroEducativoEmpleadorRate =
    legalParameters.find((p) => p.tipo === "seguro_educativo_empleador" && p.activo)?.porcentaje || 1.5
  const riesgoProfesionalRate =
    legalParameters.find((p) => p.tipo === "riesgo_profesional" && p.activo)?.porcentaje || 0.98

  const seguroSocialEmpleado = round((salarioBruto * seguroSocialEmpleadoRate) / 100)
  const seguroSocialEmpleador = round((salarioBruto * seguroSocialEmpleadorRate) / 100)

  const seguroEducativo = round((salarioBruto * seguroEducativoRate) / 100)
  const seguroEducativoEmpleador = round((salarioBruto * seguroEducativoEmpleadorRate) / 100)

  const riesgoProfesional = round((salarioBruto * riesgoProfesionalRate) / 100)

  // Nota: Para ISR regular, la base es (Salario Base * 12) + DTM (Salario Base) = Salario Base * 13,
  // pero el cálculo del DTM se ajusta en la función calculateDecimoTercerMesWithDeductions
  const salarioMensual = employee.salarioBase
  const salarioAnual = salarioMensual * 13

  let isrAnual = 0
  if (salarioAnual > 11000) {
    if (salarioAnual <= 50000) {
      isrAnual = ((salarioAnual - 11000) * 15) / 100
    } else {
      isrAnual = 5850 + ((salarioAnual - 50000) * 25) / 100
    }
  }

  let isr = round(isrAnual / 26)
  if (tipoPeriodo === "mensual") {
    isr = round(isrAnual / 13)
  }

  const shouldApplyDeduccionesBancarias =
    !employee.mesesDeduccionesBancarias ||
    employee.mesesDeduccionesBancarias.length === 0 ||
    employee.mesesDeduccionesBancarias.includes(currentMonth)

  const shouldApplyPrestamos =
    !employee.mesesPrestamos || employee.mesesPrestamos.length === 0 || employee.mesesPrestamos.includes(currentMonth)

  let deduccionesBancarias = shouldApplyDeduccionesBancarias ? employee.deduccionesBancarias || 0 : 0
  let prestamos = shouldApplyPrestamos ? employee.prestamos || 0 : 0

  if (tipoPeriodo === "quincenal") {
    deduccionesBancarias = round(deduccionesBancarias / 2)
    prestamos = round(prestamos / 2)
  }

  let otrasDeduccionesPersonalizadas = 0
  if (employee.otrasDeduccionesPersonalizadas && employee.otrasDeduccionesPersonalizadas.length > 0) {
    otrasDeduccionesPersonalizadas = round(
      employee.otrasDeduccionesPersonalizadas
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
            monto = (salarioBruto * d.monto) / 100
          }
          if (tipoPeriodo === "quincenal") {
            monto = monto / 2
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
  }
}

// CORRECCIÓN: La fórmula del DTM Bruto es (Total Ingresos / 12)
export function calculateDecimoTercerMes(
  employee: Employee,
  payrollEntries: PayrollEntry[],
  year: number,
): {
  salarioPromedio: number
  mesesTrabajados: number
  montoTotalBruto: number // Corregido el nombre a montoTotalBruto
} {
  const round = (num: number) => Math.round(num * 100) / 100

  const yearEntries = payrollEntries.filter((entry) => {
    const entryYear = Number.parseInt(entry.periodo.split("-")[0])
    return entry.empleadoId === employee.id && entryYear === year && entry.estado !== "borrador"
  })

  let mesesTrabajados = 0
  let salarioPromedio = employee.salarioBase
  let totalIngresos = 0 // Variable auxiliar para el cálculo

  if (yearEntries.length > 0) {
    mesesTrabajados = yearEntries.length
    totalIngresos = yearEntries.reduce((sum, entry) => sum + entry.salarioBruto, 0)
    salarioPromedio = totalIngresos / mesesTrabajados
  } else {
    const hireDate = new Date(employee.fechaIngreso)
    const hireYear = hireDate.getFullYear()

    if (hireYear === year) {
      const hireMonth = hireDate.getMonth()
      mesesTrabajados = 12 - hireMonth
      totalIngresos = employee.salarioBase * mesesTrabajados
    } else if (hireYear < year) {
      mesesTrabajados = 12
      totalIngresos = employee.salarioBase * 12
    }
  }

  // CORRECCIÓN CLAVE: La fórmula legal del DTM Bruto Total Anual es (Total Ingresos / 12)
  const montoTotalBruto = round(totalIngresos / 12)

  return {
    salarioPromedio: round(salarioPromedio),
    mesesTrabajados,
    montoTotalBruto,
  }
}

// CORRECCIÓN: Se ajusta el cálculo del monto total, ISR y distribución de cuotas
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
    const entryYear = Number.parseInt(entry.periodo.split("-")[0])
    return entry.empleadoId === employee.id && entryYear === year && entry.estado !== "borrador"
  })

  let mesesTrabajados = 0
  let salarioPromedio = employee.salarioBase
  let totalIngresos = 0
  let mesesDetalle: string[] = []

  if (yearEntries.length > 0) {
    const uniqueMonths = new Set(yearEntries.map((entry) => entry.periodo.split("-").slice(0, 2).join("-")))
    mesesTrabajados = uniqueMonths.size
    totalIngresos = yearEntries.reduce((sum, entry) => sum + entry.salarioBruto, 0)
    salarioPromedio = totalIngresos / mesesTrabajados

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
      "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ]
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
      totalIngresos = employee.salarioBase * mesesTrabajados

      const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
        "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
      ]
      for (let i = hireMonth; i < 12; i++) {
        mesesDetalle.push(monthNames[i])
      }
    } else if (hireYear < year) {
      mesesTrabajados = 12
      totalIngresos = employee.salarioBase * 12
      mesesDetalle = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
        "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
      ]
    }
  }

  // CORRECCIÓN CLAVE: Monto Bruto Total del Décimo (Ingresos Anuales / 12)
  const montoTotal = round(totalIngresos / 12)

  // 2. Cálculo de deducciones sobre el Monto Bruto Total Anual
  const css = round((montoTotal * 7.25) / 100)
  const cssPatrono = round((montoTotal * 10.75) / 100)

  // Base para calcular el ISR Anual (Salario Base * 12) + 0 (el DTM no cuenta para sí mismo)
  const salarioAnual = employee.salarioBase * 12 

  let isrAnual = 0
  if (salarioAnual > 11000) {
    if (salarioAnual <= 50000) {
      isrAnual = ((salarioAnual - 11000) * 15) / 100
    } else {
      isrAnual = 5850 + ((salarioAnual - 50000) * 25) / 100
    }
  }

  // CORRECCIÓN CLAVE: ISR total a retener sobre el DTM (Generalmente 1/12 del ISR anual)
  const isr = round(isrAnual / 12) 

  // 3. Totales
  const totalDeducciones = round(css + isr)
  const totalAportesPatronales = round(cssPatrono)
  const montoNeto = round(montoTotal - totalDeducciones)

  // 4. Distribución en Cuotas, ajustando el redondeo a la última cuota
  const pagoBase = round(montoNeto / 3)
  const pagoAbril = pagoBase
  const pagoAgosto = pagoBase
  const pagoDiciembre = round(montoNeto - pagoAbril - pagoAgosto) 

  // Debugging log (Muestra los resultados con la lógica corregida)
  console.log("[v0] ========================================")
  console.log("[v0] Empleado:", employee.nombre, employee.apellido)
  console.log("[v0] Meses trabajados:", mesesTrabajados)
  console.log("[v0] Meses detalle:", mesesDetalle.join(", "))
  console.log("[v0] Salario promedio: $", salarioPromedio.toFixed(2))
  console.log("[v0] Total ingresos: $", totalIngresos.toFixed(2))
  console.log("[v0] FÓRMULA CORREGIDA: Total Ingresos / 12")
  console.log("[v0] Cálculo: ", `${totalIngresos.toFixed(2)} / 12 = ${montoTotal.toFixed(2)}`)
  console.log("[v0] Monto bruto (Total Anual): $", montoTotal.toFixed(2))
  console.log("[v0] CSS Empleado (7.25%): $", css.toFixed(2))
  console.log("[v0] CSS Patrono (10.75%): $", cssPatrono.toFixed(2))
  console.log("[v0] ISR (Total Décimo): $", isr.toFixed(2))
  console.log("[v0] Total deducciones empleado: $", totalDeducciones.toFixed(2))
  console.log("[v0] Total aportes patronales: $", totalAportesPatronales.toFixed(2))
  console.log("[v0] Monto neto (Total Anual): $", montoNeto.toFixed(2))
  console.log("[v0] Pago Abril: $", pagoAbril.toFixed(2))
  console.log("[v0] Pago Agosto: $", pagoAgosto.toFixed(2))
  console.log("[v0] Pago Diciembre: $", pagoDiciembre.toFixed(2))
  console.log("[v0] ========================================")

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

// La función calculateSIPEPaymentDate se mantiene igual
export function calculateSIPEPaymentDate(periodo: string): string {
  const [year, month] = periodo.split("-").map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-15`
}

// CORRECCIÓN: Se ajusta la lógica para sumar 1/3 de las deducciones totales calculadas
export function calculateSIPEPayment(
  payrollEntries: PayrollEntry[],
  periodo: string,
  allEmployees: Employee[],
  legalParameters: LegalParameters[],
  isrBrackets: ISRBracket[],
) {
  const round = (num: number) => Math.round(num * 100) / 100

  console.log("[v0] ========================================")
  console.log("[v0] SIPE Calculation for period:", periodo)
  console.log("[v0] Total employees in company:", allEmployees.length)

  const [year, month] = periodo.split("-").map(Number)
  const isDecimoMonth = month === 4 || month === 8 || month === 12 // Abril, Agosto, Diciembre

  const periodEntries = payrollEntries.filter((e) => e.periodo === periodo)
  console.log("[v0] Payroll entries for this period:", periodEntries.length)

  const employeesWithEntriesIds = new Set(periodEntries.map((e) => e.empleadoId))
  console.log("[v0] Employees with payroll entries:", employeesWithEntriesIds.size)

  // Calculate for employees with payroll entries
  let totalSeguroSocialEmpleado = round(periodEntries.reduce((sum, e) => sum + e.seguroSocialEmpleado, 0))
  let totalSeguroSocialEmpleador = round(periodEntries.reduce((sum, e) => sum + e.seguroSocialEmpleador, 0))
  let totalSeguroEducativoEmpleado = round(periodEntries.reduce((sum, e) => sum + e.seguroEducativo, 0))
  let totalSeguroEducativoEmpleador = round(periodEntries.reduce((sum, e) => sum + e.seguroEducativoEmpleador, 0))
  let totalRiesgoProfesional = round(periodEntries.reduce((sum, e) => sum + e.riesgoProfesional, 0))
  let totalISR = round(periodEntries.reduce((sum, e) => sum + e.isr, 0))

  let totalDecimoEmpleado = 0
  let totalDecimoPatrono = 0
  let totalDecimoISR = 0

  if (isDecimoMonth) {
    console.log("[v0] This is a décimo month, calculating décimo deductions...")
    for (const employee of allEmployees) {
      const decimo = calculateDecimoTercerMesWithDeductions(
        employee,
        payrollEntries,
        year,
        legalParameters,
        isrBrackets,
      )

      // CORRECCIÓN: Sumar 1/3 de las deducciones TOTALES del Décimo (CSS e ISR)
      const cssPorCuota = round(decimo.css / 3) // 1/3 del CSS total del décimo
      const cssPatronoPorCuota = round(decimo.cssPatrono / 3) // 1/3 del CSS Patrono total del décimo
      const isrPorCuota = round(decimo.isr / 3) // 1/3 del ISR total del décimo

      totalDecimoEmpleado += cssPorCuota
      totalDecimoPatrono += cssPatronoPorCuota
      totalDecimoISR += isrPorCuota
    }

    totalDecimoEmpleado = round(totalDecimoEmpleado)
    totalDecimoPatrono = round(totalDecimoPatrono)
    totalDecimoISR = round(totalDecimoISR)

    console.log("[v0] Total décimo CSS employee (por cuota):", totalDecimoEmpleado)
    console.log("[v0] Total décimo CSS employer (por cuota):", totalDecimoPatrono)
    console.log("[v0] Total décimo ISR (por cuota):", totalDecimoISR)

    // Add décimo deductions to totals
    totalSeguroSocialEmpleado = round(totalSeguroSocialEmpleado + totalDecimoEmpleado)
    totalSeguroSocialEmpleador = round(totalSeguroSocialEmpleador + totalDecimoPatrono)
    totalISR = round(totalISR + totalDecimoISR)
  }

  const employeesWithoutEntries = allEmployees.filter((emp) => !employeesWithEntriesIds.has(emp.id))
  console.log("[v0] Employees without payroll entries:", employeesWithoutEntries.length)
  console.log("[v0] Total employees being calculated:", employeesWithEntriesIds.size + employeesWithoutEntries.length)

  const seguroSocialEmpleadoRate =
    legalParameters.find((p) => p.tipo === "seguro_social_empleado" && p.activo)?.porcentaje || 9.75
  const seguroSocialEmpleadorRate =
    legalParameters.find((p) => p.tipo === "seguro_social_empleador" && p.activo)?.porcentaje || 13.25
  const seguroEducativoRate = legalParameters.find((p) => p.tipo === "seguro_educativo" && p.activo)?.porcentaje || 1.25
  const seguroEducativoEmpleadorRate =
    legalParameters.find((p) => p.tipo === "seguro_educativo_empleador" && p.activo)?.porcentaje || 1.5
  const riesgoProfesionalRate =
    legalParameters.find((p) => p.tipo === "riesgo_profesional" && p.activo)?.porcentaje || 0.98

  for (const employee of employeesWithoutEntries) {
    const salarioBase = employee.salarioBase
    // Se asume el pago mensual para empleados sin entries (para propósitos del SIPE)
    totalSeguroSocialEmpleado += round((salarioBase * seguroSocialEmpleadoRate) / 100)
    totalSeguroSocialEmpleador += round((salarioBase * seguroSocialEmpleadorRate) / 100)
    totalSeguroEducativoEmpleado += round((salarioBase * seguroEducativoRate) / 100)
    totalSeguroEducativoEmpleador += round((salarioBase * seguroEducativoEmpleadorRate) / 100)
    totalRiesgoProfesional += round((salarioBase * riesgoProfesionalRate) / 100)

    // Calculate ISR for employees without entries
    const salarioAnual = salarioBase * 13 // Base de ISR incluye DTM
    let isrAnual = 0
    if (salarioAnual > 11000) {
      if (salarioAnual <= 50000) {
        isrAnual = ((salarioAnual - 11000) * 15) / 100
      } else {
        isrAnual = 5850 + ((salarioAnual - 50000) * 25) / 100
      }
    }
    const isrMensual = round(isrAnual / 13)
    totalISR += isrMensual
  }

  const totalAPagar = round(
    totalSeguroSocialEmpleado +
      totalSeguroSocialEmpleador +
      totalSeguroEducativoEmpleado +
      totalSeguroEducativoEmpleador +
      totalRiesgoProfesional +
      totalISR,
  )

  console.log("[v0] Final SIPE total:", totalAPagar)
  console.log("[v0] ========================================")

  return {
    periodo,
    fechaLimite: calculateSIPEPaymentDate(periodo),
    totalSeguroSocialEmpleado: round(totalSeguroSocialEmpleado),
    totalSeguroSocialEmpleador: round(totalSeguroSocialEmpleador),
    totalSeguroEducativoEmpleado: round(totalSeguroEducativoEmpleado),
    totalSeguroEducativoEmpleador: round(totalSeguroEducativoEmpleador),
    totalRiesgoProfesional: round(totalRiesgoProfesional),
    totalISR: round(totalISR),
    totalDecimoEmpleado: round(totalDecimoEmpleado),
    totalDecimoPatrono: round(totalDecimoPatrono),
    totalDecimoISR: round(totalDecimoISR),
    isDecimoMonth,
    totalAPagar,
    estado: "pendiente" as const,
  }
}