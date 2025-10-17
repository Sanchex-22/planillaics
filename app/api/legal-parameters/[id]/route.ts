// File: app/api/legal-parameters/[id]/route.ts

import { db } from '@/lib/db/db'
import { NextResponse } from 'next/server'

// PATCH /api/legal-parameters/[id] - Actualizar un parámetro
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()

    const updatedData = {
        ...data,
        porcentaje: data.porcentaje ? Number(data.porcentaje) : undefined,
        fechaVigencia: data.fechaVigencia ? new Date(data.fechaVigencia) : undefined,
    }

    const updatedParameter = await db.legalParameters.update({
      where: { id: params.id },
      data: updatedData,
    })

    const serializedParameter = {
        ...updatedParameter,
        fechaVigencia: updatedParameter.fechaVigencia.toISOString().split('T')[0],
    }

    return NextResponse.json(serializedParameter)
  } catch (error) {
    console.error('Error updating legal parameter:', error)
    return NextResponse.json({ error: 'Failed to update legal parameter' }, { status: 500 })
  }
}

// DELETE /api/legal-parameters/[id] - Eliminar un parámetro
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await db.legalParameters.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Legal parameter deleted successfully' })
  } catch (error) {
    console.error('Error deleting legal parameter:', error)
    return NextResponse.json({ error: 'Failed to delete legal parameter' }, { status: 500 })
  }
}