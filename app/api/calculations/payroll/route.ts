// File: app/api/calculations/payroll/route.ts

import { NextResponse } from 'next/server'
import { calculatePayroll, PayrollCalculationInput } from '@/lib/server-calculations'

// POST /api/calculations/payroll - Calcula la nómina para un empleado
export async function POST(request: Request) {
  try {
    // La data de entrada debe ser la estructura de cálculo
    const input = (await request.json()) as PayrollCalculationInput

    if (!input.employee || !input.legalParameters || !input.isrBrackets) {
      return NextResponse.json({ error: 'Missing calculation inputs' }, { status: 400 })
    }

    const result = calculatePayroll(input)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error calculating payroll:', error)
    return NextResponse.json({ error: 'Failed to calculate payroll' }, { status: 500 })
  }
}