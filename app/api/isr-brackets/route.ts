// File: app/api/isr-brackets/route.ts

import { NextResponse } from 'next/server'
import type { ISRBracket } from '@/lib/types'
import { db } from '@/lib/db/db'

// GET /api/isr-brackets?companiaId=... - Obtener todos los tramos
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companiaId = url.searchParams.get('companiaId')

    if (!companiaId) {
      return NextResponse.json({ error: 'Missing companiaId' }, { status: 400 })
    }

    const brackets = await db.iSRBracket.findMany({
      where: { companiaId },
      orderBy: { desde: 'asc' },
    })

    return NextResponse.json(brackets)
  } catch (error) {
    console.error('Error fetching ISR brackets:', error)
    return NextResponse.json({ error: 'Failed to fetch ISR brackets' }, { status: 500 })
  }
}

// POST /api/isr-brackets - Reemplazar/Insertar tramos ISR para una compañía
export async function POST(request: Request) {
  try {
    const { companiaId, brackets } = (await request.json()) as { companiaId: string; brackets: Omit<ISRBracket, 'id'>[] }

    if (!companiaId || !brackets || brackets.length === 0) {
      return NextResponse.json({ error: 'Missing companiaId or brackets data' }, { status: 400 })
    }

    // 1. Eliminar todos los tramos anteriores para esta compañía
    const deleteOperation = db.iSRBracket.deleteMany({
      where: { companiaId },
    })

    // 2. Insertar los nuevos tramos
    const createOperation = db.iSRBracket.createMany({
      data: brackets.map(b => ({
        ...b,
        companiaId,
        desde: Number(b.desde),
        hasta: b.hasta ? Number(b.hasta) : null,
        porcentaje: Number(b.porcentaje),
        deduccionFija: Number(b.deduccionFija),
      })),
    })

    // Ejecutar ambas operaciones en una transacción
    await db.$transaction([deleteOperation, createOperation])

    return NextResponse.json({ message: 'ISR brackets updated successfully' }, { status: 201 })
  } catch (error) {
    console.error('Error updating ISR brackets:', error)
    return NextResponse.json({ error: 'Failed to update ISR brackets' }, { status: 500 })
  }
}