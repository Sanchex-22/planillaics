// Core data types for the payroll system

export interface Company {
  id: string
  nombre: string
  ruc: string
  direccion?: string
  telefono?: string
  email?: string
  representanteLegal?: string
  activo: boolean
  fechaCreacion: string
}

export interface User {
  id: string
  nombre: string
  email: string
  rol: "super_admin" | "contador"
  companias: string[] // Array of company IDs the user has access to
  activo: boolean
  imageUrl?: string
  clerkId?: string| null
}

export interface Employee {
  id: string
  companiaId: string
  cedula: string
  nombre: string
  apellido: string
  fechaIngreso: string
  salarioBase: number
  ingresoAcumulado?: number // Total accumulated income since hire date
  ultimaActualizacionIngreso?: string // Last date income was updated
  departamento: string
  cargo: string
  estado: "activo" | "inactivo"
  email?: string
  telefono?: string
  direccion?: string
  deduccionesBancarias?: number
  mesesDeduccionesBancarias?: number[]
  prestamos?: number
  mesesPrestamos?: number[]
  otrasDeduccionesPersonalizadas?: EmployeeDeduction[]
}

// File: lib/types.ts (Asegúrate de que coincida con lo que tu frontend/backend espera)

export interface EmployeeDeduction {
  // Asegúrate de que estos campos existan y sean correctos
  id: string; 
  concepto: string;
  monto: number;
  tipo: 'fijo' | 'porcentual'; // Ejemplo
  activo: boolean; 
  // ... cualquier otro campo que uses, como 'mensual'
}

export interface LegalParameters {
  fondoCesantiaRate: any
  riesgoProfesionalRate: any
  seguroEducativoEmpleadoRate: any
  seguroSocialEmpleadoRate: any
  seguroSocialEmpleadorRate: any
  id: string
  companiaId: string
  nombre: string
  tipo:
    | "seguro_social_empleado"
    | "seguro_social_empleador"
    | "seguro_educativo"
    | "seguro_educativo_empleador"
    | "riesgo_profesional"
    | "fondo_cesantia"
    | "otro"
  porcentaje: number
  activo: boolean
  fechaVigencia: string
}

export interface ISRBracket {
  id: string
  companiaId: string
  desde: number
  hasta: number | null // null means infinity
  porcentaje: number
  deduccionFija: number
}

export interface PayrollEntry {
  id: string
  companiaId: string
  empleadoId: string
  periodo: string // YYYY-MM-Q (e.g., "2025-01-1" for first quincenal of January)
  tipoPeriodo: "quincenal" | "mensual" // Type of period
  salarioBruto: number
  horasExtras: number
  bonificaciones: number
  otrosIngresos: number
  seguroSocialEmpleado: number
  seguroEducativo: number
  isr: number
  deduccionesBancarias: number
  prestamos: number
  otrasDeduccionesPersonalizadas: number
  otrasRetenciones: number
  salarioNeto: number
  fechaCalculo: string
  estado: "borrador" | "aprobado" | "pagado"
  seguroSocialEmpleador: number
  seguroEducativoEmpleador: number
  riesgoProfesional: number
  fondoCesantia: number
}

export interface DecimoTercerMes {
  id: string
  companiaId: string
  empleadoId: string
  anio: number
  salarioPromedio: number
  mesesTrabajados: number
  montoTotal: number
  css: number
  cssPatrono: number // Added employer CSS contribution for décimo (10.75%)
  isr: number
  totalDeducciones: number
  totalAportesPatronales: number // Added total employer contributions
  montoNeto: number
  pagoAbril: number
  pagoAgosto: number
  pagoDiciembre: number
  fechaCalculo: string
  estado: "calculado" | "pagado_parcial" | "pagado_completo"
}

export interface PayrollReport {
  companiaId: string
  periodo: string
  totalEmpleados: number
  totalSalarioBruto: number
  totalDeducciones: number
  totalSalarioNeto: number
  totalSeguroSocialEmpleador: number
  detalles: PayrollEntry[]
}

export interface SIPEPayment {
  companiaId: string
  periodo: string
  fechaLimite: string
  totalSeguroSocialEmpleado: number
  totalSeguroSocialEmpleador: number
  totalSeguroEducativoEmpleado: number
  totalSeguroEducativoEmpleador: number
  totalRiesgoProfesional: number
  totalFondoCesantia: number
  totalAPagar: number
  estado: "pendiente" | "pagado"
  fechaPago?: string
  referenciaPago?: string
}
