// File: app/api/sipe-payments/[id]/route.ts

import { db } from '@/lib/db/db'
import { NextResponse } from 'next/server'

// PATCH /api/sipe-payments/[id] - Actualizar el estado de un pago SIPE
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()

    const updatedData = {
        ...data,
        fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : undefined,
        fechaPago: data.fechaPago ? new Date(data.fechaPago) : undefined,
    }

    const updatedPayment = await db.sIPEPayment.update({
      where: { id: params.id },
      data: updatedData,
    })

    const serializedPayment = {
        ...updatedPayment,
        fechaLimite: updatedPayment.fechaLimite.toISOString().split('T')[0],
        fechaPago: updatedPayment.fechaPago?.toISOString().split('T')[0] || null,
    }


    return NextResponse.json(serializedPayment)
  } catch (error) {
    console.error('Error updating SIPE payment:', error)
    return NextResponse.json({ error: 'Failed to update SIPE payment' }, { status: 500 })
  }
}

// DELETE /api/sipe-payments/[id] - Eliminar un pago SIPE
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await db.sIPEPayment.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'SIPE payment deleted successfully' })
  } catch (error) {
    console.error('Error deleting SIPE payment:', error)
    return NextResponse.json({ error: 'Failed to delete SIPE payment' }, { status: 500 })
  }
}