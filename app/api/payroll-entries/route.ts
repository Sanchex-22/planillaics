// File: app/api/payroll-entries/route.ts

import { NextResponse } from 'next/server'
import type { PayrollEntry } from '@/lib/types'
import { db } from '@/lib/db/db'

// GET /api/payroll-entries?companiaId=...&periodo=... - Obtener entradas de planilla
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companiaId = url.searchParams.get('companiaId')
    const periodo = url.searchParams.get('periodo') // Formato YYYY-MM o YYYY-MM-DD (para quincena)

    if (!companiaId || !periodo) {
      return NextResponse.json({ error: 'Missing companiaId or periodo' }, { status: 400 })
    }

    const entries = await db.payrollEntry.findMany({
      where: { 
          companiaId,
          periodo: { startsWith: periodo }
      },
      orderBy: { fechaCalculo: 'desc' },
      include: { employee: true } // Incluir datos del empleado
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching payroll entries:', error)
    return NextResponse.json({ error: 'Failed to fetch payroll entries' }, { status: 500 })
  }
}

// POST /api/payroll-entries - Guardar o actualizar una lista de entradas
export async function POST(request: Request) {
  try {
    const entries = (await request.json()) as PayrollEntry[]
    
    if (!entries || entries.length === 0) {
        return NextResponse.json({ error: 'No entries provided' }, { status: 400 })
    }

    // Usamos upsert para evitar duplicados si se envía la misma entrada
    const results = await db.$transaction(
      entries.map(entry => db.payrollEntry.upsert({
        where: { empleadoId_periodo: { empleadoId: entry.empleadoId, periodo: entry.periodo } },
        update: {
            ...entry,
            fechaCalculo: new Date(entry.fechaCalculo),
        },
        create: {
            ...entry,
            fechaCalculo: new Date(entry.fechaCalculo),
        } as any,
      }))
    )

    return NextResponse.json(results, { status: 201 })
  } catch (error) {
    console.error('Error saving payroll entries:', error)
    return NextResponse.json({ error: 'Failed to save payroll entries' }, { status: 500 })
  }
}

// DELETE /api/payroll-entries?companiaId=...&periodo=... - Eliminar entradas por período
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const companiaId = url.searchParams.get('companiaId')
    const periodo = url.searchParams.get('periodo')

    if (!companiaId || !periodo) {
      return NextResponse.json({ error: 'Missing companiaId or periodo' }, { status: 400 })
    }

    const deleted = await db.payrollEntry.deleteMany({
      where: {
          companiaId,
          periodo: { startsWith: periodo }
      },
    })

    return NextResponse.json({ message: `${deleted.count} payroll entries deleted successfully` }, { status: 200 })
  } catch (error) {
    console.error('Error deleting payroll entries:', error)
    return NextResponse.json({ error: 'Failed to delete payroll entries' }, { status: 500 })
  }
}