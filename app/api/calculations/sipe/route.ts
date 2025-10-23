import { NextResponse } from 'next/server'
import { db } from '@/lib/db/db'
import { calculateSIPEPayment } from '@/lib/payroll-calculations'

// POST /api/calculations/sipe - Calcula el total a pagar del SIPE para un periodo
export async function POST(request: Request) {
  try {
    const { companiaId, periodo } = await request.json() // periodo: YYYY-MM

    if (!companiaId || !periodo) {
      return NextResponse.json({ error: 'Missing companiaId or periodo' }, { status: 400 })
    }

    // 1. Obtener todos los empleados activos de la compañía
    const allEmployees = await db.employee.findMany({ where: { companiaId, estado: "activo" } })
    if (allEmployees.length === 0) {
        return NextResponse.json({ message: 'No active employees found for SIPE calculation' }, { status: 200 })
    }

    // 2. Obtener todas las entradas de planilla pagadas del periodo
    const payrollEntries = await db.payrollEntry.findMany({ 
        where: { companiaId, estado: "pagado" } 
    }) // Se filtra por "pagado" para asegurar que solo se sume lo que realmente se calculó/pagó

    // 3. Obtener parámetros legales y rangos de ISR
    const legalParameters = await db.legalParameters.findMany({ where: { companiaId, activo: true } })
    // CORRECCIÓN: Añadir la obtención de los rangos de ISR (isrBrackets)
    const isrBrackets = await db.iSRBracket.findMany({ where: { companiaId, activo: true } })
    
    // 4. Ejecutar el cálculo del servidor
    // CORRECCIÓN: Añadir isrBrackets como el quinto argumento
    const result = calculateSIPEPayment(
        payrollEntries as any,
        periodo,
        allEmployees as any,
        legalParameters as any,
        isrBrackets as any // <-- Argumento añadido
    )

    // Se retorna el resultado sin guardar, el frontend decidirá si guardar con un POST a /api/sipe-payments
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error calculating SIPE payment:', error)
    return NextResponse.json({ error: 'Failed to calculate SIPE payment' }, { status: 500 })
  }
}
