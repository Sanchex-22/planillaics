// File: app/api/employees/route.ts (CORREGIDO PARA ERRORES JSON Y P2002)

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { EmployeeDeduction } from '@/lib/types' 
import { db } from '@/lib/db/db';

// FUNCIÓN AUXILIAR: Maneja la inconsistencia del tipo Json de Prisma
// FUNCIÓN AUXILIAR CORREGIDA: Maneja la inconsistencia del tipo Json de Prisma
const safeParseJsonField = (field: Prisma.JsonValue | null): EmployeeDeduction[] => {
    if (!field) return [];
    
    let result: unknown = field;

    if (typeof field === 'string') {
        try {
            result = JSON.parse(field);
        } catch (e) {
            console.error("Failed to parse JSON string:", field, e);
            return []; 
        }
    }
    
    // Si el resultado es un array, usamos la DOBLE CONVERSIÓN para asegurar el tipado.
    if (Array.isArray(result)) {
        // CORRECCIÓN APLICADA AQUÍ: Convertir a 'unknown' primero.
        return result as unknown as EmployeeDeduction[]; 
    }
    
    return [];
};


// POST /api/employees - Crear un nuevo empleado
export async function POST(request: Request) {
  try {
    const data = await request.json()

    if (!data.companiaId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // 1. Preparar los datos para Prisma
    const createData: Prisma.EmployeeCreateInput = {
      ...data,
      // Convertir la fecha string a Date
      fechaIngreso: new Date(data.fechaIngreso),
      salarioBase: Number(data.salarioBase), 
      // Pasar el objeto/array de deducciones directamente; Prisma lo serializará si es necesario.
      otrasDeduccionesPersonalizadas: data.otrasDeduccionesPersonalizadas || [],
      
      // Conexión al modelo Company
      company: { connect: { id: data.companiaId } },
    }
    
    // Quitar la propiedad 'companiaId' usada para el connect
    delete (createData as any).companiaId;
    
    // 2. Crear el empleado en la DB (Línea 36 original)
    const newEmployee = await db.employee.create({
      data: createData,
    })

    // 3. Serializar la respuesta (CORRECCIÓN APLICADA EN LA LÍNEA 47)
    const serializedEmployee = {
      ...newEmployee,
      fechaIngreso: newEmployee.fechaIngreso.toISOString().split('T')[0],
      // Usamos la función auxiliar que maneja null y string JSON
      otrasDeduccionesPersonalizadas: safeParseJsonField(newEmployee.otrasDeduccionesPersonalizadas), 
    }

    return NextResponse.json(serializedEmployee, { status: 201 }) 
  } catch (error) {
    console.error('Error creating employee:', error)
    
    // Manejar errores de unicidad de Prisma (P2002)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: 'La cédula ya existe para esta compañía.' }, { status: 409 })
    }
    
    // Manejar otros errores
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}

// GET /api/employees - Obtener lista de empleados
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companiaId = searchParams.get('companiaId')

    if (!companiaId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const employees = await db.employee.findMany({
      where: { companiaId },
      orderBy: { nombre: 'asc' },
    })

    // Serializar la respuesta (Usando la función auxiliar)
    const serializedEmployees = employees.map(emp => ({
        ...emp,
        fechaIngreso: emp.fechaIngreso.toISOString().split('T')[0],
        otrasDeduccionesPersonalizadas: safeParseJsonField(emp.otrasDeduccionesPersonalizadas),
    }))

    return NextResponse.json(serializedEmployees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}