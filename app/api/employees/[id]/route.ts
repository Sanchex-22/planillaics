// File: app/api/employees/[id]/route.ts

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { EmployeeDeduction } from '@/lib/types'
import { db } from '@/lib/db/db'

// PATCH /api/employees/[id] - Actualizar un empleado
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const data = await request.json()

    const updatedData: Prisma.EmployeeUpdateInput = {
      ...data,
      fechaIngreso: data.fechaIngreso ? new Date(data.fechaIngreso) : undefined,
      salarioBase: data.salarioBase ? Number(data.salarioBase) : undefined,
      // Manejar el campo JSON
      otrasDeduccionesPersonalizadas: data.otrasDeduccionesPersonalizadas 
        ? JSON.stringify(data.otrasDeduccionesPersonalizadas as EmployeeDeduction[]) 
        : undefined,
    }

    const updatedEmployee = await db.employee.update({
      where: { id },
      data: updatedData,
    })

    const serializedEmployee = {
        ...updatedEmployee,
        fechaIngreso: updatedEmployee.fechaIngreso.toISOString().split('T')[0],
        otrasDeduccionesPersonalizadas: JSON.parse(updatedEmployee.otrasDeduccionesPersonalizadas as string),
    }

    return NextResponse.json(serializedEmployee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

// DELETE /api/employees/[id] - Eliminar un empleado
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    
    await db.employee.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}