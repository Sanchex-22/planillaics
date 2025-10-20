import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db/db'

// POST /api/employees/import - Inserta múltiples empleados desde el proceso de importación
export async function POST(request: Request) {
    try {
        // La data esperada es un array de objetos listos para la DB
        const data = (await request.json()) as Prisma.EmployeeCreateInput[]
        
        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'No employee data provided for import.' }, { status: 400 })
        }

        const successfulImports: Prisma.EmployeeCreateInput[] = [];
        const failedImports: Array<{ row: any; error: string }> = [];

        // Usamos transacciones individuales con try/catch para registrar fallos sin detener el lote
        for (const employeeData of data) {
            try {
                // Validación de integridad y unicidad manual previa a la inserción
                if (!employeeData.companiaId || !employeeData.cedula || !employeeData.nombre || !employeeData.salarioBase) {
                    throw new Error('Missing required fields: companiaId, cedula, nombre, or salarioBase.');
                }

                // 1. Verificar si ya existe un empleado con la misma cédula en la compañía
                const existingEmployee = await db.employee.findUnique({
                    where: {
                        companiaId_cedula: {
                            companiaId: employeeData.companiaId,
                            cedula: employeeData.cedula,
                        }
                    }
                });

                if (existingEmployee) {
                    // Si existe, actualizarlo (UPSERT implícito en esta lógica)
                    await db.employee.update({
                        where: { id: existingEmployee.id },
                        data: {
                            ...employeeData,
                            fechaIngreso: new Date(employeeData.fechaIngreso as string),
                            company: { connect: { id: employeeData.companiaId } },
                        } as any // Cast for Prisma types
                    });
                } else {
                    // Si no existe, crearlo
                    await db.employee.create({
                        data: {
                            ...employeeData,
                            fechaIngreso: new Date(employeeData.fechaIngreso as string),
                            company: { connect: { id: employeeData.companiaId } },
                        } as any // Cast for Prisma types
                    });
                }

                successfulImports.push(employeeData);

            } catch (innerError: any) {
                // Captura el error específico para la fila actual
                failedImports.push({ 
                    row: employeeData, 
                    error: innerError.message || 'Error desconocido al insertar registro.' 
                });
            }
        }

        return NextResponse.json({
            message: 'Import process completed.',
            successfulImports: successfulImports.length,
            failedImports: failedImports.map(f => f.error),
        }, { status: 200 });

    } catch (error) {
        console.error('Fatal Error during bulk import:', error)
        return NextResponse.json({ error: 'Fallo fatal en el procesamiento de la importación.' }, { status: 500 })
    }
}

// Opcional: Manejador GET (generalmente no usado para importación)
export async function GET() {
    return NextResponse.json({ message: 'Method Not Allowed for GET' }, { status: 405 });
}
