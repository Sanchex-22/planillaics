// File: app/api/sipe-payments/route.ts

import { NextResponse } from 'next/server'
import type { SIPEPayment } from '@/lib/types'
import { db } from '@/lib/db/db'

// GET /api/sipe-payments?companiaId=... - Obtener todos los pagos SIPE
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companiaId = url.searchParams.get('companiaId')

    if (!companiaId) {
      return NextResponse.json({ error: 'Missing companiaId' }, { status: 400 })
    }

    const payments = await db.sIPEPayment.findMany({
      where: { companiaId },
      orderBy: { periodo: 'desc' },
    })
    
    const serializedPayments = payments.map(p => ({
        ...p,
        fechaLimite: p.fechaLimite.toISOString().split('T')[0],
        fechaPago: p.fechaPago?.toISOString().split('T')[0] || null,
    }))

    return NextResponse.json(serializedPayments)
  } catch (error) {
    console.error('Error fetching SIPE payments:', error)
    return NextResponse.json({ error: 'Failed to fetch SIPE payments' }, { status: 500 })
  }
}

// POST /api/sipe-payments - Guardar un pago SIPE (generalmente creado por el cálculo)
export async function POST(request: Request) {
  try {
    const data = (await request.json()) as Omit<SIPEPayment, 'id'>

    const newPayment = await db.sIPEPayment.upsert({
        where: { companiaId_periodo: { companiaId: data.companiaId, periodo: data.periodo } },
        update: {
            ...data,
            fechaLimite: new Date(data.fechaLimite),
            fechaPago: data.fechaPago ? new Date(data.fechaPago) : null,
        },
        create: {
            ...data,
            fechaLimite: new Date(data.fechaLimite),
            fechaPago: data.fechaPago ? new Date(data.fechaPago) : null,
        } as any,
    })

    const serializedPayment = {
        ...newPayment,
        fechaLimite: newPayment.fechaLimite.toISOString().split('T')[0],
        fechaPago: newPayment.fechaPago?.toISOString().split('T')[0] || null,
    }

    return NextResponse.json(serializedPayment, { status: 201 })
  } catch (error) {
    console.error('Error saving SIPE payment:', error)
    return NextResponse.json({ error: 'Failed to save SIPE payment' }, { status: 500 })
  }
}