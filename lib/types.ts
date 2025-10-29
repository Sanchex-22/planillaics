// Core data types for the payroll system
// --- Definición simple para anidamiento ---
interface SimpleCompany {
  id: string;
  nombre: string;
}

// --- Tu tipo Employee (sin cambios) ---
export interface Employee {
  id: string;
  companiaId: string;
  cedula: string;
  nombre: string;
  apellido: string | null;
  fechaIngreso: string; // Asegúrate que sea string si viene de la API como ISO
  salarioBase: number;
  departamento: string | null;
  cargo: string | null;
  estado: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  deduccionesBancarias: number | null;
  mesesDeduccionesBancarias: number[];
  prestamos: number | null;
  mesesPrestamos: number[];
  otrasDeduccionesPersonalizadas: any; // O un tipo más específico
}

// --- Tipo Company (sin cambios) ---
export interface Company {
  id: string;
  nombre: string;
  ruc: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  representanteLegal?: string;
  activo: boolean;
  fechaCreacion: string;
}

// --- Tipo User (ACTUALIZADO) ---
export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'admin' | 'contador' | 'user';
  activo: boolean;
  clerkId?: string | null; // Acepta null como en la API
  image?: string;
  companias?: SimpleCompany[]; // <--- AÑADIDO
}

// --- Otros tipos (LegalParameter, ISRBracket, etc.) ---
export interface LegalParameter {
  id: string;
  companiaId: string;
  nombre: string;
  tipo: string;
  porcentaje: number;
  activo: boolean;
  fechaVigencia: string;
}

export interface ISRBracket {
  id: string;
  companiaId: string;
  desde: number;
  hasta: number | null;
  porcentaje: number;
  deduccionFija: number;
}
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
