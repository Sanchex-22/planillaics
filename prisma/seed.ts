import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

// --- Tipos de Datos de Ejemplo ---
type EmployeeDeduction = {
  nombre: string;
  monto: number;
  mensual: boolean; // Aplicar mes a mes?
}

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando script de seeding...')

  // 1. CREAR COMPAÑÍA DE EJEMPLO
  // CORRECCIÓN: 'ruc' ahora es un campo único válido para usar en 'where'
  const company1 = await prisma.company.upsert({
    where: { ruc: '800100200-1-2025' },
    update: {},
    create: {
      nombre: 'Intermaritime S.A.',
      ruc: '800100200-1-2025',
      direccion: 'Ciudad de Panamá, Edificio TechHub, Piso 5',
      telefono: '+507 800-1234',
      email: 'information@intermaritime.org',
      representanteLegal: 'M',
      activo: true,
    },
  })
  console.log(`Creada la compañía: ${company1.nombre} (ID: ${company1.id})`)

  // 2. CREAR USUARIO SUPER ADMIN DE EJEMPLO
  const hashedPassword = await hash('Admin2025', 10)
  const user1 = await prisma.user.upsert({
    where: { email: 'admin@intermaritime.org' },
    update: { /* Aquí podrías actualizar el hash de la contraseña si el campo existiera */ }, 
    create: {
      nombre: 'Super Admin',
      email: 'admin@intermaritime.org',
      rol: 'super_admin',
      companias: [company1.id],
      activo: true,
      // Si el modelo User tuviera un campo `password`, lo añadirías aquí.
    },
  })
  console.log(`Creado el usuario: ${user1.email}`)

  // 3. CREAR PARÁMETROS LEGALES (Panamá - Ejemplo de porcentajes para 2025)
  const legalParams = [
    { nombre: 'CSS_EMPLEADO', tipo: 'DEDUCCION_FIJA', porcentaje: 9.75, fechaVigencia: new Date('2025-01-01') },
    { nombre: 'SEGURO_EDUCATIVO_EMPLEADO', tipo: 'DEDUCCION_FIJA', porcentaje: 1.25, fechaVigencia: new Date('2025-01-01') },
    { nombre: 'CSS_EMPLEADOR', tipo: 'APORTE_PATRONAL', porcentaje: 12.25, fechaVigencia: new Date('2025-01-01') },
    { nombre: 'SEGURO_EDUCATIVO_EMPLEADOR', tipo: 'APORTE_PATRONAL', porcentaje: 1.50, fechaVigencia: new Date('2025-01-01') },
    { nombre: 'RIESGO_PROFESIONAL', tipo: 'APORTE_PATRONAL', porcentaje: 0.98, fechaVigencia: new Date('2025-01-01') }, // Ejemplo
    { nombre: 'FONDO_CESANTIA', tipo: 'APORTE_PATRONAL', porcentaje: 1.00, fechaVigencia: new Date('2025-01-01') },
  ]

  for (const param of legalParams) {
    await prisma.legalParameters.upsert({
      where: {
        companiaId_nombre_fechaVigencia: {
          companiaId: company1.id,
          nombre: param.nombre,
          fechaVigencia: param.fechaVigencia,
        },
      },
      update: { porcentaje: param.porcentaje },
      create: {
        ...param,
        companiaId: company1.id,
      },
    })
  }
  console.log('Creados 6 parámetros legales de ejemplo.')

  // 4. CREAR TRAMOS ISR (Ejemplo basado en Panamá)
  const isrBrackets = [
    { desde: 0.00, hasta: 11000.00, porcentaje: 0, deduccionFija: 0 },
    { desde: 11000.01, hasta: 50000.00, porcentaje: 15, deduccionFija: 1650.00 },
    { desde: 50000.01, hasta: null, porcentaje: 25, deduccionFija: 6650.00 },
  ]
  await prisma.iSRBracket.deleteMany({ where: { companiaId: company1.id } })

  for (const bracket of isrBrackets) {
    await prisma.iSRBracket.create({
      data: {
        ...bracket,
        companiaId: company1.id,
      },
    })
  }
  console.log('Creados 3 tramos de ISR de ejemplo.')

  // 5. CREAR EMPLEADO DE EJEMPLO
  const customDeductions: EmployeeDeduction[] = [
    { nombre: 'Seguro Privado', monto: 50.00, mensual: true },
  ]

  const employee1 = await prisma.employee.upsert({
    // CORRECCIÓN: Se usa el índice único compuesto: companiaId_cedula
    where: {
        companiaId_cedula: {
            companiaId: company1.id,
            cedula: '8-800-800',
        },
    },
    update: {},
    create: {
      companiaId: company1.id,
      cedula: '8-800-800',
      nombre: 'Roberto',
      apellido: 'Pérez',
      fechaIngreso: new Date('2023-08-15'),
      salarioBase: 2500.00, // Salario que aplica ISR
      departamento: 'Ingeniería',
      cargo: 'Desarrollador Senior',
      estado: 'activo',
      email: 'roberto.perez@tecno.com',
      deduccionesBancarias: 150.00, 
      mesesDeduccionesBancarias: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 
      prestamos: 50.00, 
      mesesPrestamos: [1, 2], 
      otrasDeduccionesPersonalizadas: customDeductions, 
    },
  })
  console.log(`Creado el empleado: ${employee1.nombre} (ID: ${employee1.id})`)

  console.log('--- Seeding completado exitosamente! ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // CORRECCIÓN: El método para desconectar es '$disconnect'
    await prisma.$disconnect()
  })