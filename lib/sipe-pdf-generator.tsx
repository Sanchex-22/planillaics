import type { SIPEPayment, Employee, PayrollEntry } from "./types"

interface SIPEPDFData {
  payment: SIPEPayment
  employees: Array<{
    employee: Employee
    entry: PayrollEntry
    seguroSocialEmpleado: number
    seguroSocialEmpleador: number
    seguroEducativoEmpleado: number
    seguroEducativoEmpleador: number
    riesgoProfesional: number
    isr: number
    totalAPagar: number
  }>
  companyName: string
}

export async function generateSIPEPDF(data: SIPEPDFData) {
  const { payment, employees, companyName } = data

  const totalEmpleados = employees.length
  const totalSalarioBruto = employees.reduce((sum, e) => sum + e.entry.salarioBruto, 0)
  const totalISR = employees.reduce((sum, e) => sum + e.isr, 0)
  const totalAportesEmpleados = payment.totalSeguroSocialEmpleado + payment.totalSeguroEducativoEmpleado
  const totalAportesPatronales =
    payment.totalSeguroSocialEmpleador + payment.totalSeguroEducativoEmpleador + payment.totalRiesgoProfesional

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante SIPE - ${payment.periodo}</title>
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
            border-bottom: 3px solid #2563eb;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .document-title {
            font-size: 20px;
            color: #4b5563;
            margin-bottom: 5px;
          }
          .period {
            font-size: 16px;
            color: #6b7280;
          }
          .payment-info {
            background: #eff6ff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #2563eb;
          }
          .payment-info h3 {
            color: #1e40af;
            margin-bottom: 15px;
            font-size: 18px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
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
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }
          .summary-card.highlight {
            background: #fef2f2;
            border-color: #dc2626;
          }
          .summary-label {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .summary-value {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
          }
          .summary-card.highlight .summary-value {
            color: #dc2626;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin: 30px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
          }
          th, td {
            padding: 10px 8px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
          }
          td {
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
            background: #dbeafe;
            font-weight: bold;
          }
          .total-row td {
            font-size: 13px;
            padding: 15px 8px;
            color: #1e40af;
          }
          .breakdown-section {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
          }
          .breakdown-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          .breakdown-item {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          .breakdown-title {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 10px;
          }
          .breakdown-amount {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          .breakdown-detail {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 5px;
          }
          .legal-note {
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin-top: 30px;
            border-radius: 4px;
          }
          .legal-note h4 {
            color: #1e40af;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .legal-note ul {
            list-style-position: inside;
            color: #1e40af;
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
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-paid {
            background: #d1fae5;
            color: #065f46;
          }
          .status-pending {
            background: #fef3c7;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${companyName}</div>
          <div class="document-title">Comprobante de Pago SIPE</div>
          <div class="period">Período: ${payment.periodo}</div>
        </div>

        <div class="payment-info">
          <h3>Información del Pago</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Período de Planilla</span>
              <span class="info-value">${payment.periodo}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Fecha Límite de Pago</span>
              <span class="info-value">${new Date(payment.fechaLimite).toLocaleDateString("es-PA")}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado</span>
              <span class="info-value">
                <span class="status-badge ${payment.estado === "pagado" ? "status-paid" : "status-pending"}">
                  ${payment.estado === "pagado" ? "Pagado" : "Pendiente"}
                </span>
              </span>
            </div>
            ${
              payment.fechaPago
                ? `
            <div class="info-item">
              <span class="info-label">Fecha de Pago</span>
              <span class="info-value">${new Date(payment.fechaPago).toLocaleDateString("es-PA")}</span>
            </div>
            `
                : ""
            }
            ${
              payment.referenciaPago
                ? `
            <div class="info-item">
              <span class="info-label">Referencia de Pago</span>
              <span class="info-value">${payment.referenciaPago}</span>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-label">Total Empleados</div>
            <div class="summary-value">${totalEmpleados}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Salario Bruto Total</div>
            <div class="summary-value">$${totalSalarioBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total ISR</div>
            <div class="summary-value">$${totalISR.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-card highlight">
            <div class="summary-label">Total SIPE</div>
            <div class="summary-value">$${payment.totalAPagar.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div class="breakdown-section">
          <h3 class="section-title">Desglose de Aportes</h3>
          <div class="breakdown-grid">
            <div class="breakdown-item">
              <div class="breakdown-title">Aportes de Empleados</div>
              <div class="breakdown-amount">$${totalAportesEmpleados.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</div>
              <div class="breakdown-detail">
                CSS: $${payment.totalSeguroSocialEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })} (9.75%) + 
                Seg. Educ.: $${payment.totalSeguroEducativoEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })} (1.25%)
              </div>
            </div>
            <div class="breakdown-item">
              <div class="breakdown-title">Aportes Patronales</div>
              <div class="breakdown-amount">$${totalAportesPatronales.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</div>
              <div class="breakdown-detail">
                CSS: $${payment.totalSeguroSocialEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })} (13.25%) + 
                Seg. Educ.: $${payment.totalSeguroEducativoEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })} (1.50%) + 
                Riesgo Prof.: $${payment.totalRiesgoProfesional.toLocaleString("es-PA", { minimumFractionDigits: 2 })} (0.98%)
              </div>
            </div>
          </div>
        </div>

        <h3 class="section-title">Detalle por Empleado</h3>
        <table>
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Cédula</th>
              <th class="text-right">Salario Bruto</th>
              <th class="text-right">CSS Emp.</th>
              <th class="text-right">CSS Patr.</th>
              <th class="text-right">Seg. Ed. Emp.</th>
              <th class="text-right">Seg. Ed. Patr.</th>
              <th class="text-right">Riesgo Prof.</th>
              <th class="text-right">ISR</th>
              <th class="text-right">Total SIPE</th>
            </tr>
          </thead>
          <tbody>
            ${employees
              .map(
                (item) => `
              <tr>
                <td>${item.employee.nombre} ${item.employee.apellido}</td>
                <td>${item.employee.cedula}</td>
                <td class="text-right amount">$${item.entry.salarioBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
                <td class="text-right amount">$${item.seguroSocialEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
                <td class="text-right amount">$${item.seguroSocialEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
                <td class="text-right amount">$${item.seguroEducativoEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
                <td class="text-right amount">$${item.seguroEducativoEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
                <td class="text-right amount">$${item.riesgoProfesional.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
                <td class="text-right amount">$${item.isr.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
                <td class="text-right amount">$${item.totalAPagar.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
            `,
              )
              .join("")}
            <tr class="total-row">
              <td colspan="2">TOTALES</td>
              <td class="text-right amount">$${totalSalarioBruto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              <td class="text-right amount">$${payment.totalSeguroSocialEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              <td class="text-right amount">$${payment.totalSeguroSocialEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              <td class="text-right amount">$${payment.totalSeguroEducativoEmpleado.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              <td class="text-right amount">$${payment.totalSeguroEducativoEmpleador.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              <td class="text-right amount">$${payment.totalRiesgoProfesional.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              <td class="text-right amount">$${totalISR.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              <td class="text-right amount">$${payment.totalAPagar.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="legal-note">
          <h4>Información sobre el Pago SIPE</h4>
          <ul>
            <li>El SIPE (Sistema Integrado de Pagos Electrónicos) es la plataforma de la CSS para pagos de cuotas obrero-patronales</li>
            <li>Los pagos deben realizarse antes del día 15 del mes siguiente al período de planilla</li>
            <li>Seguro Social Empleado: 9.75% | Seguro Social Patrono: 13.25%</li>
            <li>Seguro Educativo Empleado: 1.25% | Seguro Educativo Patrono: 1.50%</li>
            <li>Riesgo Profesional: 0.98% (varía según actividad económica)</li>
            <li>El ISR se paga por separado a la DGI (Dirección General de Ingresos)</li>
          </ul>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Firma del Empleador</div>
            <div class="signature-label">Representante de ${companyName}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Sello de la Empresa</div>
            <div class="signature-label">Comprobante Oficial</div>
          </div>
        </div>

        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>Este documento es un comprobante oficial del pago al SIPE - Caja de Seguro Social de Panamá</p>
        </div>
      </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `comprobante-sipe-${payment.periodo}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
