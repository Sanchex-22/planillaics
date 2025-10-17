// File: app/api/payroll-entries/[id]/route.ts

import { db } from '@/lib/db/db'
import { NextResponse } from 'next/server'

// DELETE /api/payroll-entries/[id] - Eliminar una entrada
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await db.payrollEntry.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Payroll entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting payroll entry:', error)
    return NextResponse.json({ error: 'Failed to delete payroll entry' }, { status: 500 })
  }
}