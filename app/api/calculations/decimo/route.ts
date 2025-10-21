// File: app/api/calculations/decimo/route.ts


import { NextResponse } from 'next/server'

import { db } from '@/lib/db/db'
import { calculateDecimoTercerMesWithDeductions } from '@/lib/payroll-calculations'

// POST /api/calculations/decimo - Calcula el décimo para un empleado específico
export async function POST(request: Request) {
  try {
    const { empleadoId, companiaId, anio } = await request.json()

    if (!empleadoId || !companiaId || !anio) {
      return NextResponse.json({ error: 'Missing employeeId, companiaId, or anio' }, { status: 400 })
    }

    // 1. Obtener datos del empleado
    const employee = await db.employee.findUnique({ where: { id: empleadoId } })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // 2. Obtener entradas de planilla de la compañía para el cálculo del promedio
    const payrollEntries = await db.payrollEntry.findMany({
        where: { companiaId, periodo: { startsWith: String(anio) } }
    })

    // 3. Obtener parámetros legales (necesarios para el CSS/ISR del décimo)
    const legalParameters = await db.legalParameters.findMany({ where: { companiaId, activo: true } })
    
    // 4. Ejecutar el cálculo del servidor
    const result = calculateDecimoTercerMesWithDeductions(
        employee as any, // Se necesita cast porque Prisma Employee es diferente al tipo de front
        payrollEntries as any,
        Number(anio),
        legalParameters as any,
        [] // ISR Brackets no se usan directamente aquí, pero la función calculateISR sí
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error calculating décimo:', error)
    return NextResponse.json({ error: 'Failed to calculate décimo' }, { status: 500 })
  }
}