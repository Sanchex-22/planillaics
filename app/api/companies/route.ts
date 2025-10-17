// File: app/api/companies/route.ts

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import type { Company } from '@/lib/types'

// GET /api/companies - Obtener todas las empresas (o por usuario, si se implementa auth)
export async function GET() {
  try {
    const companies = await db.company.findMany({
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

// POST /api/companies - Crear una nueva empresa
export async function POST(request: Request) {
  try {
    const data = (await request.json()) as Omit<Company, 'id'>

    const newCompany = await db.company.create({
      data: {
        ...data,
        activo: data.activo ?? true,
      },
    })

    return NextResponse.json(newCompany, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}

// DELETE /api/companies/clear-all - Borrar todas las empresas
// ADVERTENCIA: Este endpoint es destructivo y solo debería usarse en tests o por Super Admin.
export async function DELETE() {
  try {
    // Esto borrará en cascada (si configurado) todos los datos de planilla, empleados, etc.
    const deleted = await db.company.deleteMany({})

    return NextResponse.json({ message: `Deleted ${deleted.count} companies and related data` }, { status: 200 })
  } catch (error) {
    console.error('Error deleting all companies:', error)
    return NextResponse.json({ error: 'Failed to delete all companies' }, { status: 500 })
  }
}