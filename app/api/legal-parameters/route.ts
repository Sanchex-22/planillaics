// File: app/api/legal-parameters/route.ts

import { NextResponse } from 'next/server'
import type { LegalParameters } from '@/lib/types'
import { db } from '@/lib/db/db'

// GET /api/legal-parameters?companiaId=... - Obtener todos los parámetros
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companiaId = url.searchParams.get('companiaId')

    if (!companiaId) {
      return NextResponse.json({ error: 'Missing companiaId' }, { status: 400 })
    }

    const parameters = await db.legalParameters.findMany({
      where: { companiaId },
      orderBy: { nombre: 'asc' },
    })

    const serializedParameters = parameters.map(param => ({
        ...param,
        fechaVigencia: param.fechaVigencia.toISOString().split('T')[0],
    }))

    return NextResponse.json(serializedParameters)
  } catch (error) {
    console.error('Error fetching legal parameters:', error)
    return NextResponse.json({ error: 'Failed to fetch legal parameters' }, { status: 500 })
  }
}

// POST /api/legal-parameters - Crear un nuevo parámetro
export async function POST(request: Request) {
  try {
    const data = (await request.json()) as Omit<LegalParameters, 'id'>

    const newParameter = await db.legalParameters.create({
      data: {
        ...data,
        porcentaje: Number(data.porcentaje),
        fechaVigencia: new Date(data.fechaVigencia),
        activo: data.activo ?? true,
      } as any,
    })
    
    const serializedParameter = {
        ...newParameter,
        fechaVigencia: newParameter.fechaVigencia.toISOString().split('T')[0],
    }

    return NextResponse.json(serializedParameter, { status: 201 })
  } catch (error) {
    console.error('Error creating legal parameter:', error)
    return NextResponse.json({ error: 'Failed to create legal parameter' }, { status: 500 })
  }
}