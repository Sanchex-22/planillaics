// File: app/api/decimo-entries/route.ts
import { NextResponse } from 'next/server'
import type { DecimoTercerMes } from '@/lib/types'
import { db } from '@/lib/db/db'

// GET /api/decimo-entries?companiaId=...&anio=... - Obtener entradas por año
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companiaId = url.searchParams.get('companiaId')
    const anio = url.searchParams.get('anio')

    if (!companiaId || !anio) {
      return NextResponse.json({ error: 'Missing companiaId or anio' }, { status: 400 })
    }

    const entries = await db.decimoTercerMes.findMany({
      where: { 
          companiaId,
          anio: Number(anio)
      },
      orderBy: { fechaCalculo: 'desc' },
      include: { employee: true } // Incluir datos del empleado
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching décimo entries:', error)
    return NextResponse.json({ error: 'Failed to fetch décimo entries' }, { status: 500 })
  }
}

// POST /api/decimo-entries - Guardar o actualizar una lista de entradas
export async function POST(request: Request) {
  try {
    const entries = (await request.json()) as DecimoTercerMes[]
    
    if (!entries || entries.length === 0) {
        return NextResponse.json({ error: 'No entries provided' }, { status: 400 })
    }

    const results = await db.$transaction(
      entries.map(entry => db.decimoTercerMes.upsert({
        where: { empleadoId_anio: { empleadoId: entry.empleadoId, anio: entry.anio } },
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
    console.error('Error saving décimo entries:', error)
    return NextResponse.json({ error: 'Failed to save décimo entries' }, { status: 500 })
  }
}

// DELETE /api/decimo-entries?companiaId=...&anio=... - Eliminar entradas por año
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const companiaId = url.searchParams.get('companiaId')
    const anio = url.searchParams.get('anio')

    if (!companiaId || !anio) {
      return NextResponse.json({ error: 'Missing companiaId or anio' }, { status: 400 })
    }

    const deleted = await db.decimoTercerMes.deleteMany({
      where: {
          companiaId,
          anio: Number(anio)
      },
    })

    return NextResponse.json({ message: `${deleted.count} décimo entries deleted successfully` }, { status: 200 })
  } catch (error) {
    console.error('Error deleting décimo entries:', error)
    return NextResponse.json({ error: 'Failed to delete décimo entries' }, { status: 500 })
  }
}