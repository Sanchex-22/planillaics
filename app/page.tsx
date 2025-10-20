// File: app/page.tsx (MIGRADO A PRISMA)

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, TrendingUp, Calendar } from "lucide-react"
// import { SidebarNav } from "@/components/sidebar-nav" // No se usa en el return principal

// IMPORTACIÓN DE PRISMA
import { db } from "@/lib/db/db"; 

// Convertir esto a un Server Component asíncrono
export default async function DashboardPage() {
  // NOTA: En un proyecto real, el ID de la compañía se obtendría de la sesión.
  // Aquí usamos el primer registro o un ID de fallback.
  const firstCompany = await db.company.findFirst();
  // Usar el operador || directamente para el fallback
  const currentCompanyId = firstCompany?.id ?? "default-company-id"; 

  // Generar YYYY-MM para la consulta del mes (ej. 2025-10)
  const currentMonth = new Date().toISOString().slice(0, 7) 

  // --- Consulta de Datos ---

  // 1. Empleados Activos
  const activeEmployees = await db.employee.count({
    where: {
      companiaId: currentCompanyId,
      estado: "activo"
    }
  })

  // 2. Data de Planilla del Mes
  const currentMonthPayroll = await db.payrollEntry.findMany({
    where: {
      companiaId: currentCompanyId,
      // Busca todas las entradas que comienzan con el mes actual (incluyendo quincenas)
      periodo: {
        startsWith: currentMonth 
      }
    },
    select: {
      salarioNeto: true,
      salarioBruto: true
    }
  })

  // 3. Cálculos de Totales (Añadido '?? 0' para robustez en caso de valores inesperados)
  const totalPayroll = currentMonthPayroll.reduce((sum, entry) => sum + (entry.salarioNeto ?? 0), 0);
  const totalGross = currentMonthPayroll.reduce((sum, entry) => sum + (entry.salarioBruto ?? 0), 0);

  // Fecha para el Card de Período
  const currentMonthName = new Date().toLocaleDateString("es-PA", { month: "long", year: "numeric" });


  return (
    <div className="p-6 md:p-10"> 
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del sistema de planilla</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">Total de empleados en nómina</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Planilla del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalPayroll.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Salario neto total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Salario Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalGross.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total antes de deducciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Período Actual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonthName}
            </div>
            <p className="text-xs text-muted-foreground">Mes en curso</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido al Sistema de Planilla</CardTitle>
            <CardDescription>
              Sistema completo de gestión de nómina para Panamá con cálculos automáticos de Seguro Social, Seguro
              Educativo, ISR y Décimo Tercer Mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Características principales:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Gestión completa de empleados con información detallada</li>
                  <li>Cálculo automático de planilla con todas las deducciones legales</li>
                  <li>Cálculo de Décimo Tercer Mes proporcional</li>
                  <li>Configuración de parámetros legales (Seguro Social, Seguro Educativo, ISR)</li>
                  <li>Generación de reportes descargables en Excel</li>
                  <li>Historial completo de planillas por período</li>
                  <li>Soporte para múltiples empresas con aislamiento total de datos</li>
                </ul>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Comience agregando empleados desde el menú **Empleados** o calcule la planilla del mes
                  actual en **Calcular Planilla**.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
