// AJUSTE 1: Importar 'hash' de 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

// --- Tipos de Datos de Ejemplo ---
type EmployeeDeduction = {
  nombre: string
  monto: number
  mensual: boolean // Aplicar mes a mes?
}

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando script de seeding...')

  // --- 1. CREAR COMPAÑÍAS ---
  const companyIntermaritime = await prisma.company.upsert({
    where: { ruc: '800100200-1-2025' },
    update: {},
    create: {
      nombre: 'Intermaritime',
      ruc: '800100200-1-2025',
      direccion: 'Ciudad de Panamá, Edificio TechHub, Piso 5',
      telefono: '+507 800-1234',
      email: 'info@intermaritime.com',
      representanteLegal: 'Representante Intermaritime',
      activo: true,
    },
  })
  console.log(`Creada/Actualizada la compañía: ${companyIntermaritime.nombre} (ID: ${companyIntermaritime.id})`)

  const companyPMTS = await prisma.company.upsert({
    where: { ruc: 'PMTS-RUC-EJEMPLO' },
    update: {},
    create: {
      nombre: 'PMTS',
      ruc: 'PMTS-RUC-EJEMPLO',
      direccion: 'Ciudad de Panamá, Oficina PMTS',
      telefono: '+507 300-5678',
      email: 'contact@pmts.com',
      representanteLegal: 'Representante PMTS',
      activo: true,
    },
  })
  console.log(`Creada/Actualizada la compañía: ${companyPMTS.nombre} (ID: ${companyPMTS.id})`)


  // --- 2. CREAR USUARIOS CON CONTRASEÑAS HASHEADAS Y ASIGNAR COMPAÑÍAS ---

  const passwordModerator = await hash('moderator123', 12)
  const passwordAdmin = await hash('admin123', 12)
  const passwordSuperAdmin = await hash('superadmin123', 12)

  // Usuario Moderator (acceso solo a PMTS)
  const userModerator = await prisma.user.upsert({
    where: { email: 'moderator@example.com' },
    update: { hashedPassword: passwordModerator },
    create: {
      nombre: 'Moderator User',
      email: 'moderator@example.com',
      rol: 'moderator',
      activo: true,
      hashedPassword: passwordModerator,
      companias: {
        connect: [{ id: companyPMTS.id }],
      },
    },
  })
  console.log(`Creado/Actualizado el usuario: ${userModerator.email} con rol ${userModerator.rol}`)

  // Usuario Admin (acceso solo a Intermaritime)
  const userAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { hashedPassword: passwordAdmin },
    create: {
      nombre: 'Admin User',
      email: 'admin@example.com',
      rol: 'admin',
      activo: true,
      hashedPassword: passwordAdmin,
      companias: {
        connect: [{ id: companyIntermaritime.id }],
      },
    },
  })
  console.log(`Creado/Actualizado el usuario: ${userAdmin.email} con rol ${userAdmin.rol}`)

  // Usuario Super Admin (acceso a ambas compañías)
  const userSuperAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {
        hashedPassword: passwordSuperAdmin,
        companias: {
            set: [
                { id: companyIntermaritime.id },
                { id: companyPMTS.id }
            ]
        }
    },
    create: {
      nombre: 'Super Admin',
      email: 'superadmin@example.com',
      rol: 'super_admin',
      activo: true,
      hashedPassword: passwordSuperAdmin,
      companias: {
        connect: [
            { id: companyIntermaritime.id },
            { id: companyPMTS.id }
        ],
      },
    },
  })
  console.log(`Creado/Actualizado el usuario: ${userSuperAdmin.email} con rol ${userSuperAdmin.rol}`)

  // --- 3. CREAR PARÁMETROS LEGALES Y TRAMOS ISR (Mantenido para Intermaritime) ---
  // (Se mantiene la lógica anterior, puedes duplicarla para PMTS si es necesario)
  
  console.log(`Configurando parámetros para ${companyIntermaritime.nombre}...`)
  const legalParams = [
    { nombre: 'CSS_EMPLEADO', tipo: 'DEDUCCION_FIJA', porcentaje: 9.75, fechaVigencia: new Date('2025-01-01') },
    { nombre: 'SEGURO_EDUCATIVO_EMPLEADO', tipo: 'DEDUCCION_FIJA', porcentaje: 1.25, fechaVigencia: new Date('2025-01-01') },
    { nombre: 'CSS_EMPLEADOR', tipo: 'APORTE_PATRONAL', porcentaje: 12.25, fechaVigencia: new Date('2025-01-01') },
    { nombre: 'SEGURO_EDUCATIVO_EMPLEADOR', tipo: 'APORTE_PATRONAL', porcentaje: 1.50, fechaVigencia: new Date('2025-01-01') },
    { nombre: 'RIESGO_PROFESIONAL', tipo: 'APORTE_PATRONAL', porcentaje: 0.98, fechaVigencia: new Date('2025-01-01') },
  ]

  await Promise.all(
    legalParams.map((param) =>
      prisma.legalParameters.upsert({
        where: {
          companiaId_nombre_fechaVigencia: {
            companiaId: companyIntermaritime.id,
            nombre: param.nombre,
            fechaVigencia: param.fechaVigencia,
          },
        },
        update: { porcentaje: param.porcentaje },
        create: {
          ...param,
          companiaId: companyIntermaritime.id,
        },
      })
    )
  )
  console.log(`Creados/Actualizados parámetros legales para ${companyIntermaritime.nombre}.`)

  const isrBrackets = [
    { desde: 0.00, hasta: 11000.00, porcentaje: 0, deduccionFija: 0 },
    { desde: 11000.01, hasta: 50000.00, porcentaje: 15, deduccionFija: 1650.00 },
    { desde: 50000.01, hasta: null, porcentaje: 25, deduccionFija: 6650.00 },
  ]

  await prisma.iSRBracket.deleteMany({ where: { companiaId: companyIntermaritime.id } })
  await prisma.iSRBracket.createMany({
    data: isrBrackets.map((bracket) => ({
      ...bracket,
      companiaId: companyIntermaritime.id,
    })),
  })
  console.log(`Recreados tramos de ISR para ${companyIntermaritime.nombre}.`)

  
  // --- 4. CREAR 5 EMPLEADOS PARA CADA COMPAÑÍA ---

  console.log(`Creando empleados para ${companyIntermaritime.nombre}...`)
  const employeesIntermaritime = [
    { cedula: '8-800-801', nombre: 'Ana', apellido: 'Gomez', salarioBase: 2200.00, cargo: 'Analista BI' },
    { cedula: '8-800-802', nombre: 'Luis', apellido: 'Pinto', salarioBase: 1800.00, cargo: 'Soporte IT' },
    { cedula: '8-800-803', nombre: 'Carla', apellido: 'Suarez', salarioBase: 3000.00, cargo: 'Gerente de Proyectos' },
    { cedula: '8-800-804', nombre: 'David', apellido: 'Ruiz', salarioBase: 1500.00, cargo: 'Asistente Contable' },
    { cedula: '8-800-805', nombre: 'Elena', apellido: 'Morales', salarioBase: 2500.00, cargo: 'Desarrolladora Sr.' },
  ];

  await Promise.all(
    employeesIntermaritime.map(emp => 
      prisma.employee.upsert({
        where: { companiaId_cedula: { companiaId: companyIntermaritime.id, cedula: emp.cedula } },
        update: { ...emp },
        create: {
          ...emp,
          companiaId: companyIntermaritime.id,
          fechaIngreso: new Date('2024-01-15'),
          departamento: 'Operaciones',
          estado: 'activo',
          email: `${emp.nombre.toLowerCase()}.${emp.apellido.toLowerCase()}@intermaritime.com`,
          mesesDeduccionesBancarias: [], // Inicializar campos array vacíos
          mesesPrestamos: [], // Inicializar campos array vacíos
        }
      })
    )
  );
  console.log(`Creados/Actualizados ${employeesIntermaritime.length} empleados para ${companyIntermaritime.nombre}.`)

  
  console.log(`Creando empleados para ${companyPMTS.nombre}...`)
  const employeesPMTS = [
    { cedula: '9-900-901', nombre: 'Pedro', apellido: 'Martinez', salarioBase: 2100.00, cargo: 'Supervisor' },
    { cedula: '9-900-902', nombre: 'Sofia', apellido: 'Loren', salarioBase: 1900.00, cargo: 'Asistente Admin' },
    { cedula: '9-900-903', nombre: 'Jorge', apellido: 'Campos', salarioBase: 2800.00, cargo: 'Logística' },
    { cedula: '9-900-904', nombre: 'Maria', apellido: 'Delgado', salarioBase: 1600.00, cargo: 'Recepcionista' },
    { cedula: '9-900-905', nombre: 'Ricardo', apellido: 'Forte', salarioBase: 3200.00, cargo: 'Gerente de Flota' },
  ];

  await Promise.all(
    employeesPMTS.map(emp => 
      prisma.employee.upsert({
        where: { companiaId_cedula: { companiaId: companyPMTS.id, cedula: emp.cedula } },
        update: { ...emp },
        create: {
          ...emp,
          companiaId: companyPMTS.id,
          fechaIngreso: new Date('2023-11-01'),
          departamento: 'Administración',
          estado: 'activo',
          email: `${emp.nombre.toLowerCase()}.${emp.apellido.toLowerCase()}@pmts.com`,
          mesesDeduccionesBancarias: [], // Inicializar campos array vacíos
          mesesPrestamos: [], // Inicializar campos array vacíos
        }
      })
    )
  );
  console.log(`Creados/Actualizados ${employeesPMTS.length} empleados para ${companyPMTS.nombre}.`)


  console.log('--- Seeding completado exitosamente! ---')
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })