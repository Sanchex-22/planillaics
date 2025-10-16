import type { Employee } from "./types"

interface ISRCalculation {
  employee: Employee
  salarioMensual: number
  salarioAnual: number
  montoExento: number
  baseImponible: number
  isrAnual: number
  isrMensual: number
  tasaAplicada: string
}

export async function generateISRPDF(calculation: ISRCalculation, year: number, companyName = "Mi Empresa") {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante ISR - ${calculation.employee.nombre} ${calculation.employee.apellido}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #1a1a1a;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #dc2626;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
          }
          .document-title {
            font-size: 20px;
            color: #4b5563;
            margin-bottom: 5px;
          }
          .year {
            font-size: 16px;
            color: #6b7280;
          }
          .employee-info {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .employee-info h3 {
            color: #1f2937;
            margin-bottom: 15px;
            font-size: 18px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
          }
          .calculation-section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
            font-size: 13px;
          }
          td {
            font-size: 14px;
            color: #1f2937;
          }
          .text-right {
            text-align: right;
          }
          .amount {
            font-family: 'Courier New', monospace;
            font-weight: 600;
          }
          .total-row {
            background: #fee2e2;
            font-weight: bold;
          }
          .total-row td {
            font-size: 16px;
            padding: 15px 12px;
            color: #991b1b;
          }
          .tax-brackets {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .bracket-card {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }
          .bracket-card.active {
            background: #fef2f2;
            border-color: #dc2626;
          }
          .bracket-title {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
          }
          .bracket-rate {
            font-size: 20px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 4px;
          }
          .bracket-range {
            font-size: 11px;
            color: #9ca3af;
          }
          .legal-note {
            background: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin-top: 30px;
            border-radius: 4px;
          }
          .legal-note h4 {
            color: #991b1b;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .legal-note ul {
            list-style-position: inside;
            color: #7f1d1d;
            font-size: 12px;
            line-height: 1.8;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          .signature-section {
            margin-top: 60px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            border-top: 2px solid #1f2937;
            margin-bottom: 8px;
            padding-top: 8px;
          }
          .signature-label {
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${companyName}</div>
          <div class="document-title">Comprobante de Impuesto Sobre la Renta (ISR)</div>
          <div class="year">Año Fiscal ${year}</div>
        </div>

        <div class="employee-info">
          <h3>Información del Empleado</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Nombre Completo</span>
              <span class="info-value">${calculation.employee.nombre} ${calculation.employee.apellido}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cédula</span>
              <span class="info-value">${calculation.employee.cedula}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Departamento</span>
              <span class="info-value">${calculation.employee.departamento}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cargo</span>
              <span class="info-value">${calculation.employee.cargo}</span>
            </div>
          </div>
        </div>

        <div class="calculation-section">
          <div class="section-title">Tramos Fiscales del ISR en Panamá</div>
          <div class="tax-brackets">
            <div class="bracket-card ${calculation.isrAnual === 0 ? "active" : ""}">
              <div class="bracket-title">Tramo 1: Exento</div>
              <div class="bracket-rate">0%</div>
              <div class="bracket-range">Hasta $11,000</div>
            </div>
            <div class="bracket-card ${calculation.salarioAnual > 11000 && calculation.salarioAnual <= 50000 ? "active" : ""}">
              <div class="bracket-title">Tramo 2: Medio</div>
              <div class="bracket-rate">15%</div>
              <div class="bracket-range">$11,001 - $50,000</div>
            </div>
            <div class="bracket-card ${calculation.salarioAnual > 50000 ? "active" : ""}">
              <div class="bracket-title">Tramo 3: Alto</div>
              <div class="bracket-rate">25%</div>
              <div class="bracket-range">Más de $50,000</div>
            </div>
          </div>
        </div>

        <div class="calculation-section">
          <div class="section-title">Cálculo del ISR</div>
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Salario Mensual</td>
                <td class="text-right amount">$${calculation.salarioMensual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Salario Anual (incluye décimo tercer mes)</td>
                <td class="text-right amount">$${calculation.salarioAnual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Monto Exento</td>
                <td class="text-right amount">-$${calculation.montoExento.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Tasa Aplicada</td>
                <td class="text-right amount">${calculation.tasaAplicada}</td>
              </tr>
              <tr class="total-row">
                <td>ISR Anual Total</td>
                <td class="text-right amount">$${calculation.isrAnual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="total-row">
                <td>ISR Mensual (÷ 13 meses)</td>
                <td class="text-right amount">$${calculation.isrMensual.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="legal-note">
          <h4>Información Legal sobre el ISR en Panamá</h4>
          <ul>
            <li>El ISR se calcula sobre el salario anual incluyendo el décimo tercer mes (13 meses)</li>
            <li>El monto anual se divide entre 13 pagos para distribuir la carga fiscal</li>
            <li>Tramo 1 (hasta $11,000): Exento de impuestos</li>
            <li>Tramo 2 ($11,001 - $50,000): 15% sobre el excedente de $11,000</li>
            <li>Tramo 3 (más de $50,000): 15% sobre primeros $39,000 + 25% sobre excedente de $50,000</li>
            <li>El ISR se deduce mensualmente de la planilla del empleado</li>
          </ul>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Firma del Empleador</div>
            <div class="signature-label">Representante de ${companyName}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Firma del Empleado</div>
            <div class="signature-label">${calculation.employee.nombre} ${calculation.employee.apellido}</div>
          </div>
        </div>

        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>Este documento es un comprobante oficial del cálculo del Impuesto Sobre la Renta</p>
        </div>
      </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `comprobante-isr-${calculation.employee.cedula}-${year}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
