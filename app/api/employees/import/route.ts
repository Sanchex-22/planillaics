import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db/db'; 

// Función auxiliar para parsear valores numéricos opcionales (Float?)
// Retorna number o undefined si es nulo o inválido, para que Prisma use el default o null.
const safeParseFloat = (value: any): number | undefined | null => {
    if (value === null || value === undefined || value === '') {
        // Retornamos undefined para que Prisma omita el campo, usando el valor de la DB o el default.
        return undefined; 
    }
    const num = Number(value);
    // Si no es un número válido, también retornamos undefined.
    return isNaN(num) ? undefined : num;
};

// POST /api/employees/import - Inserta o actualiza múltiples empleados desde la importación
export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as any[];
        
        if (!payload || payload.length === 0) {
            return NextResponse.json({ error: 'No employee data provided for import.' }, { status: 400 });
        }

        // FIX #2: Usar 'let' para el contador
        let successfulImports = 0; 
        const failedImports: string[] = [];

        for (let i = 0; i < payload.length; i++) {
            const rowData = payload[i];
            const rowNumber = i + 2; 
            
            try {
                // Validación de campos clave
                if (!rowData.companiaId || !rowData.cedula || !rowData.nombre || !rowData.salarioBase || !rowData.fechaIngreso) {
                    throw new Error('Faltan campos obligatorios (Compañía, Cédula, Nombre, Salario Base o Fecha Ingreso).');
                }

                // --- 1. CONSTRUCCIÓN DE DATA ---
                // Data limpia y tipada, excluyendo 'companiaId' para la creación
                const baseData: Prisma.EmployeeCreateInput = {
                    cedula: String(rowData.cedula),
                    nombre: String(rowData.nombre),
                    apellido: String(rowData.apellido || ''),
                    
                    // Conversión de Fecha
                    fechaIngreso: new Date(rowData.fechaIngreso), 
                    salarioBase: Number(rowData.salarioBase),
                    estado: String(rowData.estado || 'activo'),
                    
                    // Campos opcionales
                    departamento: rowData.departamento || undefined,
                    cargo: rowData.cargo || undefined,
                    email: rowData.email || undefined,
                    telefono: rowData.telefono || undefined,
                    direccion: rowData.direccion || undefined,

                    // Deducciones opcionales (Usando safeParseFloat)
                    deduccionesBancarias: safeParseFloat(rowData.deduccionesBancarias),
                    prestamos: safeParseFloat(rowData.prestamos),
                    
                    // Arrays (Usando || [] para asegurar el tipo Array)
                    mesesDeduccionesBancarias: rowData.mesesDeduccionesBancarias || [],
                    mesesPrestamos: rowData.mesesPrestamos || [],
                    
                    // JSONB
                    otrasDeduccionesPersonalizadas: rowData.otrasDeduccionesPersonalizadas || [],
                    
                    // FIX #1: Usar la relación 'company' para establecer la FK 'companiaId'
                    company: { connect: { id: rowData.companiaId } }
                };

                // --- 2. EJECUTAR UPSERT ---
                
                // Buscar el registro existente
                const existingEmployee = await db.employee.findUnique({
                    where: {
                        companiaId_cedula: {
                            companiaId: rowData.companiaId,
                            cedula: baseData.cedula,
                        }
                    },
                    select: { id: true }
                });

                // FIX #3: Crear una versión de Update que excluye la relación `company` si existe
                // Ya que `dataToUpsert` contiene el `company: { connect: ... }`,
                // lo usamos directamente para `create`, y lo limpiamos para `update`.
                
                const dataForUpdate: Prisma.EmployeeUpdateInput = { 
                    ...baseData,
                    // Removemos explícitamente el campo 'company' para evitar conflictos con la sintaxis de update
                    // Nota: Si se permite actualizar la relación, se debe mantener, pero generalmente se remueve
                    // al actualizar campos base.
                    company: undefined // Omitir la conexión en el update
                };
                delete (dataForUpdate as any).company; // Asegurar que no se use la relación de conexión

                if (existingEmployee) {
                    // Si existe, actualizar (usamos baseData como fuente, pero sin la relación 'company' si fuera UpdateInput)
                    await db.employee.update({
                        where: { id: existingEmployee.id },
                        data: dataForUpdate as Prisma.EmployeeUpdateInput,
                    });
                } else {
                    // Si no existe, crear (usamos baseData que tiene el 'company: { connect }')
                    await db.employee.create({
                        data: baseData,
                    });
                }

                successfulImports++;

            } catch (innerError: any) {
                // Capturar y registrar el error
                const errorMsg = innerError instanceof Prisma.PrismaClientKnownRequestError 
                    ? `[Prisma Error ${innerError.code}] ${innerError.message.split('\n').pop()}` 
                    : innerError.message || 'Error desconocido al procesar la fila.';
                
                failedImports.push(`Fila ${rowNumber}: ${errorMsg}`);
            }
        }
        
        return NextResponse.json({
            message: 'Import process completed.',
            successfulImports: successfulImports,
            failedImports: failedImports,
        }, { status: 200 });

    } catch (error) {
        console.error('Fatal Error during bulk import:', error);
        return NextResponse.json({ error: 'Fallo fatal en el procesamiento de la importación.' }, { status: 500 });
    }
}

// Opcional: Manejador GET (generalmente no usado para importación)
export async function GET() {
    return NextResponse.json({ message: 'Method Not Allowed for GET' }, { status: 405 });
}
