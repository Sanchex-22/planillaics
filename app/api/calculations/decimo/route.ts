// En api/calculations/decimo/route.ts
import { NextResponse } from 'next/server'

import { db } from '@/lib/db/db'
// Importamos la función de cálculo correcta
import { calculateDecimoTercerMesWithDeductions } from '@/lib/payroll-calculations'

export async function POST(request: Request) {
  try {
    // Ahora sí recibiremos los 3 campos
    const { empleadoId, companiaId, periodo } = await request.json()

    if (!empleadoId || !companiaId || !periodo) {
      return NextResponse.json(
        { error: 'Missing employeeId, companiaId, or periodo (YYYY-MM)' },
        { status: 400 }
      )
    }

    // ... (la validación del Regex está bien)
    const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/
    if (!periodRegex.test(periodo)) {
      return NextResponse.json(
        { error: 'Invalid periodo format. Expected YYYY-MM' },
        { status: 400 }
      )
    }

    const [year, month] = periodo.split('-').map(Number)

    // 1. Determinar los meses del cuatrimestre a consultar
    let mesesCuatrimestre: string[] = []
    
    if (month === 4) {
      // Partida 1 (Ene, Feb, Mar, Abr)
      mesesCuatrimestre = [`${year}-01`, `${year}-02`, `${year}-03`, `${year}-04`]
    } else if (month === 8) {
      // Partida 2 (May, Jun, Jul, Ago)
      mesesCuatrimestre = [`${year}-05`, `${year}-06`, `${year}-07`, `${year}-08`]
    } else if (month === 12) {
      // Partida 3 (Sep, Oct, Nov, Dic)
      mesesCuatrimestre = [`${year}-09`, `${year}-10`, `${year}-11`, `${year}-12`]
    } else {
      return NextResponse.json(
        { error: 'El "décimo" solo se calcula en los meses 4, 8, o 12.' },
        { status: 400 }
      )
    }

    // 2. Obtener datos del empleado
    const employee = await db.employee.findUnique({ 
        where: { id: empleadoId } 
    })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // 3. Obtener entradas de planilla (Historial de salarios)
    const payrollEntries = await db.payrollEntry.findMany({
      where: {
        companiaId: companiaId, // Filtro por compañía
        empleadoId: empleadoId, // Filtro por empleado
        periodo: { in: mesesCuatrimestre },
        // Quizás quieras filtrar solo 'estado: "confirmado"'
      },
    })

    // 4. Obtener parámetros legales
    // --- CORRECCIÓN AQUÍ ---
    // Asegúrate de filtrar por 'companiaId'
    const legalParameters = await db.legalParameters.findMany({
      where: { 
        companiaId: companiaId, 
        activo: true 
      },
    })

    // 5. Ejecutar el cálculo
    const result = calculateDecimoTercerMesWithDeductions({
      employee: employee as any,
      periodo: periodo, // El período del PAGO (ej. 2025-04)
      payrollEntriesCuatrimestre: payrollEntries as any, // El historial
      legalParameters: legalParameters as any,
    })
    console.log('Décimo calculation result:', result);
    // Devolvemos el resultado individual de ESE período
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error calculating décimo API route:', error)
    // --- CORRECCIÓN AQUÍ ---
    // Devuelve un error más específico si es posible
    const errorMessage = error instanceof Error ? error.message : 'Failed to calculate décimo'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}