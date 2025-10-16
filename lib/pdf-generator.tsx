import type { Employee } from "./types"
import type { calculatePayroll } from "./payroll-calculations"

export function generatePayrollPDF(
  employee: Employee,
  calculation: ReturnType<typeof calculatePayroll>,
  periodo: string,
  companyName?: string,
) {
  // Create a new window for printing
  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    alert("Por favor, permite las ventanas emergentes para descargar el PDF")
    return
  }

  // Build personal deductions HTML
  let deduccionesPersonalesHTML = ""
  let hasPersonalDeductions = false

  if (employee.deduccionesBancarias && employee.deduccionesBancarias.length > 0) {
    hasPersonalDeductions = true
    employee.deduccionesBancarias.forEach((deduccion) => {
      deduccionesPersonalesHTML += `
        <tr>
          <td style="padding: 8px 8px 8px 24px; color: #666;">${deduccion.descripcion} (${deduccion.banco})</td>
          <td style="padding: 8px; text-align: right; font-family: monospace; color: #dc2626;">
            -$${deduccion.monto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `
    })
  }

  if (employee.prestamos && employee.prestamos.length > 0) {
    hasPersonalDeductions = true
    employee.prestamos
      .filter((p) => p.cuotasPagadas < p.totalCuotas)
      .forEach((prestamo) => {
        deduccionesPersonalesHTML += `
        <tr>
          <td style="padding: 8px 8px 8px 24px; color: #666;">
            Préstamo: ${prestamo.descripcion} (${prestamo.cuotasPagadas}/${prestamo.totalCuotas})
          </td>
          <td style="padding: 8px; text-align: right; font-family: monospace; color: #dc2626;">
            -$${prestamo.montoCuota.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `
      })
  }

  if (employee.otrasRetenciones && employee.otrasRetenciones.length > 0) {
    hasPersonalDeductions = true
    employee.otrasRetenciones
      .filter((r) => r.activo)
      .forEach((retencion) => {
        const monto = retencion.tipo === "fijo" ? retencion.monto : (employee.salarioBase * retencion.monto) / 100
        deduccionesPersonalesHTML += `
        <tr>
          <td style="padding: 8px 8px 8px 24px; color: #666;">
            ${retencion.descripcion} ${retencion.tipo === "porcentaje" ? `(${retencion.monto}%)` : ""}
          </td>
          <td style="padding: 8px; text-align: right; font-family: monospace; color: #dc2626;">
            -$${monto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `
      })
  }

  const personalDeductionsSection = hasPersonalDeductions
    ? `
    <tr>
      <td colspan="2" style="padding: 8px; font-weight: 600; background-color: #f9fafb;">
        Deducciones Personales
      </td>
    </tr>
    ${deduccionesPersonalesHTML}
  `
    : ""

  const totalCostoPatronal =
    calculation.seguroSocialEmpleador + calculation.seguroEducativoEmpleador + calculation.riesgoProfesional

  const costoTotalEmpresa = calculation.salarioBruto + totalCostoPatronal

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Comprobante de Pago - ${employee.nombre} ${employee.apellido}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          padding: 40px;
          color: #1f2937;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
        }
        .header h1 {
          font-size: 24px;
          margin-bottom: 8px;
        }
        .header p {
          color: #6b7280;
          font-size: 14px;
        }
        .info-section {
          margin-bottom: 30px;
        }
        .info-section h2 {
          font-size: 18px;
          margin-bottom: 12px;
          color: #374151;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .info-item {
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 6px;
        }
        .info-item label {
          display: block;
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .info-item value {
          display: block;
          font-size: 14px;
          font-weight: 500;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        th {
          background-color: #f3f4f6;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          border-bottom: 2px solid #e5e7eb;
        }
        th:last-child {
          text-align: right;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }
        tr:last-child td {
          border-bottom: none;
        }
        .section-header {
          background-color: #f9fafb;
          font-weight: 600;
        }
        .total-row {
          font-weight: 600;
          background-color: #f9fafb;
        }
        .net-salary-row {
          background-color: #dbeafe;
          font-weight: 700;
          font-size: 16px;
        }
        .employer-costs {
          background-color: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .employer-costs h3 {
          font-size: 16px;
          margin-bottom: 12px;
        }
        .cost-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .cost-row.total {
          border-top: 2px solid #d1d5db;
          margin-top: 8px;
          padding-top: 12px;
          font-weight: 600;
        }
        .cost-row.grand-total {
          border-top: 2px solid #9ca3af;
          margin-top: 8px;
          padding-top: 12px;
          font-weight: 700;
          font-size: 16px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
        @media print {
          body {
            padding: 20px;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${companyName ? `<p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${companyName}</p>` : ""}
        <h1>Comprobante de Pago</h1>
        <p>Período: ${periodo}</p>
      </div>

      <div class="info-section">
        <h2>Información del Empleado</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Nombre Completo</label>
            <value>${employee.nombre} ${employee.apellido}</value>
          </div>
          <div class="info-item">
            <label>Cédula</label>
            <value>${employee.cedula}</value>
          </div>
          <div class="info-item">
            <label>Departamento</label>
            <value>${employee.departamento}</value>
          </div>
          <div class="info-item">
            <label>Cargo</label>
            <value>${employee.cargo}</value>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h2>Cálculo de Salario</h2>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: 600;">Salario Bruto</td>
              <td style="text-align: right; font-family: monospace; font-weight: 600;">
                $${calculation.salarioBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 8px; font-weight: 600; background-color: #f9fafb;">
                Deducciones Legales
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 8px 8px 24px; color: #666;">Seguro Social Empleado (9.75%)</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; color: #dc2626;">
                -$${calculation.seguroSocialEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 8px 8px 24px; color: #666;">Seguro Educativo (1.25%)</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; color: #dc2626;">
                -$${calculation.seguroEducativo.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 8px 8px 24px; color: #666;">ISR</td>
              <td style="padding: 8px; text-align: right; font-family: monospace; color: #dc2626;">
                -$${calculation.isr.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            ${personalDeductionsSection}
            <tr class="total-row">
              <td style="padding: 10px; font-weight: 600;">Total Deducciones</td>
              <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: 600; color: #dc2626;">
                -$${calculation.totalDeducciones.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr class="net-salary-row">
              <td style="padding: 12px; font-weight: 700; font-size: 16px;">Salario Neto</td>
              <td style="padding: 12px; text-align: right; font-family: monospace; font-weight: 700; font-size: 16px; color: #2563eb;">
                $${calculation.salarioNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="employer-costs">
        <h3>Costos Patronales (Empleador)</h3>
        <div class="cost-row">
          <span style="color: #666;">Seguro Social Empleador (13.25%)</span>
          <span style="font-family: monospace;">
            $${calculation.seguroSocialEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div class="cost-row">
          <span style="color: #666;">Seguro Educativo Empleador (1.5%)</span>
          <span style="font-family: monospace;">
            $${calculation.seguroEducativoEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div class="cost-row">
          <span style="color: #666;">Riesgo Profesional (0.98%)</span>
          <span style="font-family: monospace;">
            $${calculation.riesgoProfesional.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div class="cost-row total">
          <span>Total Costo Patronal</span>
          <span style="font-family: monospace;">
            $${totalCostoPatronal.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div class="cost-row grand-total">
          <span>Costo Total para la Empresa</span>
          <span style="font-family: monospace; font-size: 18px;">
            $${costoTotalEmpresa.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div class="footer">
        <p>Este documento es un comprobante de pago generado automáticamente.</p>
        <p>Generado el ${new Date().toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}
