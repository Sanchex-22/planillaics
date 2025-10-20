import { format } from "date-fns";
import { apiFetcher } from "./utils";

// -----------------------------------------------------------
// 1. TIPOS DE DATOS DEL EXCEL
// -----------------------------------------------------------

// Estructura esperada de una fila del Excel
export interface EmployeeExcelRow {
    cedula: string;
    nombre: string;
    apellido: string;
    fechaIngreso: string; // Formato YYYY-MM-DD
    salarioBase: number;
    departamento?: string;
    cargo?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    // Las deducciones complejas se deben agregar manualmente después de la importación inicial
}

// -----------------------------------------------------------
// 2. FUNCIÓN DE IMPORTACIÓN
// -----------------------------------------------------------

interface ImportResultFull {
    successfulImports: EmployeeExcelRow[];
    failedImports: Array<{ rowData: EmployeeExcelRow; rowNumber: number; error: string }>;
}

// Mapeo de encabezados de Excel a nombres de campos de Prisma
const COLUMN_MAP: Record<string, keyof EmployeeExcelRow> = {
    'cedula': 'cedula',
    'nombre': 'nombre',
    'apellido': 'apellido',
    'fechaingreso': 'fechaIngreso',
    'salariobase': 'salarioBase',
    'departamento': 'departamento',
    'cargo': 'cargo',
    'email': 'email',
    'telefono': 'telefono',
    'direccion': 'direccion',
    // Puedes añadir más mapeos aquí
};

// Mapea y valida una fila.
function validateAndMapRow(row: Record<string, any>, rowNumber: number): EmployeeExcelRow | string {
    const data: Partial<EmployeeExcelRow> = {};
    const missingFields: string[] = [];
    
    // 1. Mapeo simple de encabezados
    for (const key in row) {
        const prismaKey = COLUMN_MAP[key.toLowerCase().replace(/[^a-z0-9]/g, '')];
        if (prismaKey && row[key] !== null && row[key] !== undefined) {
            data[prismaKey] = row[key];
        }
    }
    
    // 2. Validaciones Requeridas
    if (!data.cedula) missingFields.push('Cédula');
    if (!data.nombre) missingFields.push('Nombre');
    if (!data.salarioBase || isNaN(Number(data.salarioBase)) || Number(data.salarioBase) <= 0) {
        missingFields.push('SalarioBase (debe ser > 0)');
    }
    if (!data.fechaIngreso) missingFields.push('FechaIngreso');

    if (missingFields.length > 0) {
        return `Faltan campos requeridos: ${missingFields.join(', ')}`;
    }

    // 3. Conversión de tipos y limpieza
    try {
        const salario = Number(data.salarioBase);
        const fecha = String(data.fechaIngreso);

        // Intento validar formato de fecha (simple YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
             // Si el dato es un número (formato de fecha de Excel), lo convertimos.
             if (typeof data.fechaIngreso === 'number') {
                const date = new Date((data.fechaIngreso - (25567 + 2)) * 86400 * 1000);
                data.fechaIngreso = format(date, 'yyyy-MM-dd');
             } else {
                 throw new Error('Formato de fecha de ingreso inválido. Use YYYY-MM-DD.');
             }
        }
        
        return {
            cedula: String(data.cedula),
            nombre: String(data.nombre),
            apellido: String(data.apellido || ''),
            fechaIngreso: data.fechaIngreso,
            salarioBase: salario,
            departamento: String(data.departamento || 'General'),
            cargo: String(data.cargo || 'Empleado'),
            email: String(data.email || ''),
            telefono: String(data.telefono || ''),
            direccion: String(data.direccion || ''),
        } as EmployeeExcelRow;

    } catch (e: any) {
        return `Error de formato en la fila: ${e.message}`;
    }
}

// Función principal para procesar la hoja y enviar al API
export async function importEmployeesFromSheet(
    sheetData: string[][], 
    companiaId: string, 
    setProgress: (p: number) => void
): Promise<{ successfulImports: EmployeeExcelRow[]; failedImports: Array<{ rowData: EmployeeExcelRow | {}; rowNumber: number; error: string }> }> {
    
    const headers = sheetData[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows = sheetData.slice(1);
    
    const employeesToImport: any[] = [];
    const failedImports: Array<{ rowData: EmployeeExcelRow | {}; rowNumber: number; error: string }> = [];

    // Paso 1: Mapear y validar la data del Excel
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.every(cell => !cell)) continue; // Saltar filas completamente vacías
        
        const rowObject: Record<string, any> = {};
        headers.forEach((header, index) => {
            if (header) {
                rowObject[header] = row[index];
            }
        });

        // Intentar mapear y validar
        const mappedData = validateAndMapRow(rowObject, i + 2);
        
        if (typeof mappedData === 'string') {
            failedImports.push({ rowData: rowObject, rowNumber: i + 2, error: mappedData });
        } else {
            // Añadir campos fijos para la DB
            employeesToImport.push({
                ...mappedData,
                companiaId: companiaId,
                fechaIngreso: mappedData.fechaIngreso, // Ya está en YYYY-MM-DD string
                salarioBase: mappedData.salarioBase,
                estado: 'activo',
                // Campos de deducción opcionales
                deduccionesBancarias: 0,
                mesesDeduccionesBancarias: [],
                prestamos: 0,
                mesesPrestamos: [],
                otrasDeduccionesPersonalizadas: [],
            });
        }
        setProgress(((i + 1) / rows.length) * 50); // Reportar la mitad del progreso (solo lectura)
    }

    if (employeesToImport.length === 0) {
         return { successfulImports: [], failedImports: failedImports };
    }

    // Paso 2: Enviar al API para inserción/actualización
    try {
        const apiResponse = await apiFetcher<{
            message: string;
            successfulImports: number;
            failedImports: string[];
        }>("/api/employees/import", {
            method: 'POST',
            data: employeesToImport
        });
        
        // Reportar el 100% al finalizar
        setProgress(100);

        const apiFailed: Array<{ rowData: {}; rowNumber: number; error: string }> = apiResponse.failedImports.map(errorMsg => ({
            rowData: {}, // No podemos recuperar el objeto de la fila original fácilmente, solo el error.
            rowNumber: 0, 
            error: errorMsg,
        }));


        return {
            successfulImports: employeesToImport, 
            failedImports: failedImports.concat(apiFailed),
        };

    } catch (e: any) {
        // Fallo en la conexión o error 500 del servidor
        failedImports.push({ rowData: {}, rowNumber: 0, error: `Error de conexión con el servidor: ${e.message}` });
        setProgress(100);
        return { successfulImports: [], failedImports: failedImports };
    }
}
