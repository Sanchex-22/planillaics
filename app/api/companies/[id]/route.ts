// File: app/api/companies/[id]/route.ts


import { db } from '@/lib/db/db'
import { NextResponse } from 'next/server'

// GET /api/companies/[id] - Obtener una empresa
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const company = await db.company.findUnique({
      where: { id: params.id },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
  }
}

// PATCH /api/companies/[id] - Actualizar una empresa
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()

    const updatedCompany = await db.company.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(updatedCompany)
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

// DELETE /api/companies/[id] - Eliminar una empresa
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await db.company.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Company deleted successfully' })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}