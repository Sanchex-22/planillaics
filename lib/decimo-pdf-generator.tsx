import type { Employee } from "./types"
import type { calculateDecimoTercerMesWithDeductions } from "./payroll-calculations"

export async function generateDecimoPDF(
  employee: Employee,
  calculation: ReturnType<typeof calculateDecimoTercerMesWithDeductions>,
  year: number,
  companyName = "Mi Empresa",
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante Décimo Tercer Mes - ${employee.nombre} ${employee.apellido}</title>
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
            background: #f3f4f6;
            font-weight: bold;
          }
          .total-row td {
            font-size: 16px;
            padding: 15px 12px;
          }
          .deduction-row {
            color: #dc2626;
          }
          .net-row {
            background: #dbeafe;
            color: #1e40af;
          }
          .net-row td {
            font-size: 18px;
            font-weight: bold;
            padding: 15px 12px;
          }
          .payment-schedule {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 20px;
          }
          .payment-card {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }
          .payment-month {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
          }
          .payment-amount {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
            font-family: 'Courier New', monospace;
          }
          .payment-label {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 4px;
          }
          .legal-note {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
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
            color: #1e3a8a;
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
          <div class="document-title">Comprobante de Décimo Tercer Mes</div>
          <div class="year">Año Fiscal ${year}</div>
        </div>

        <div class="employee-info">
          <h3>Información del Empleado</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Nombre Completo</span>
              <span class="info-value">${employee.nombre} ${employee.apellido}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cédula</span>
              <span class="info-value">${employee.cedula}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Departamento</span>
              <span class="info-value">${employee.departamento}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cargo</span>
              <span class="info-value">${employee.cargo}</span>
            </div>
          </div>
        </div>

        <div class="calculation-section">
          <div class="section-title">Cálculo del Décimo Tercer Mes</div>
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Salario Promedio Anual</td>
                <td class="text-right amount">$${calculation.salarioPromedio.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Meses Trabajados en ${year}</td>
                <td class="text-right amount">${calculation.mesesTrabajados} meses</td>
              </tr>
              <tr class="total-row">
                <td>Monto Total del Décimo Tercer Mes</td>
                <td class="text-right amount">$${calculation.montoTotal.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="deduction-row">
                <td>Impuesto sobre la Renta (ISR)</td>
                <td class="text-right amount">-$${calculation.isr.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="net-row">
                <td>Monto Neto a Recibir</td>
                <td class="text-right amount">$${calculation.montoNeto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="calculation-section">
          <div class="section-title">Calendario de Pagos (3 Cuotas Iguales)</div>
          <div class="payment-schedule">
            <div class="payment-card">
              <div class="payment-month">ABRIL ${year}</div>
              <div class="payment-amount">$${calculation.pagoAbril.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</div>
              <div class="payment-label">Primera cuota (1/3)</div>
            </div>
            <div class="payment-card">
              <div class="payment-month">AGOSTO ${year}</div>
              <div class="payment-amount">$${calculation.pagoAgosto.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</div>
              <div class="payment-label">Segunda cuota (1/3)</div>
            </div>
            <div class="payment-card">
              <div class="payment-month">DICIEMBRE ${year}</div>
              <div class="payment-amount">$${calculation.pagoDiciembre.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</div>
              <div class="payment-label">Tercera cuota (1/3)</div>
            </div>
          </div>
        </div>

        <div class="legal-note">
          <h4>Información Legal sobre el Décimo Tercer Mes en Panamá</h4>
          <ul>
            <li>El décimo tercer mes es un derecho laboral establecido en el Código de Trabajo de Panamá</li>
            <li>Se calcula como: (Salario Promedio × Meses Trabajados) ÷ 12</li>
            <li>Se paga en TRES cuotas iguales durante el año: Abril, Agosto y Diciembre</li>
            <li><strong>NO se aplican deducciones de Seguro Social ni Seguro Educativo</strong></li>
            <li>Solo se aplica la deducción de ISR según los tramos fiscales vigentes</li>
          </ul>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Firma del Empleador</div>
            <div class="signature-label">Representante de ${companyName}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Firma del Empleado</div>
            <div class="signature-label">${employee.nombre} ${employee.apellido}</div>
          </div>
        </div>

        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>Este documento es un comprobante oficial del pago del décimo tercer mes</p>
        </div>
      </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `decimo-tercer-mes-${employee.cedula}-${year}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function generateDecimoPaymentVoucher(
  employee: Employee,
  calculation: ReturnType<typeof calculateDecimoTercerMesWithDeductions>,
  year: number,
  paymentMonth: "abril" | "agosto" | "diciembre",
  companyName = "Mi Empresa",
) {
  const paymentAmount =
    paymentMonth === "abril"
      ? calculation.pagoAbril
      : paymentMonth === "agosto"
        ? calculation.pagoAgosto
        : calculation.pagoDiciembre

  const monthNames = {
    abril: "Abril",
    agosto: "Agosto",
    diciembre: "Diciembre",
  }

  const installmentNumber = paymentMonth === "abril" ? "1/3" : paymentMonth === "agosto" ? "2/3" : "3/3"

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante de Pago - ${monthNames[paymentMonth]} ${year}</title>
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
          }
          .voucher {
            max-width: 600px;
            margin: 0 auto;
            border: 3px solid #2563eb;
            border-radius: 12px;
            padding: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 8px;
          }
          .voucher-title {
            font-size: 18px;
            color: #4b5563;
            margin-bottom: 5px;
          }
          .payment-period {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
          }
          .employee-section {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
          }
          .employee-section h3 {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 12px;
          }
          .employee-name {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
          }
          .employee-id {
            font-size: 14px;
            color: #6b7280;
          }
          .payment-details {
            margin-bottom: 25px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-label {
            font-size: 14px;
            color: #6b7280;
          }
          .detail-value {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
            font-family: 'Courier New', monospace;
          }
          .total-section {
            background: #dbeafe;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 25px;
          }
          .total-label {
            font-size: 14px;
            color: #1e40af;
            margin-bottom: 8px;
          }
          .total-amount {
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
            font-family: 'Courier New', monospace;
          }
          .installment-info {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            margin-top: 8px;
          }
          .signature-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
          }
          .signature-line {
            border-top: 2px solid #1f2937;
            margin: 40px auto 8px;
            width: 300px;
          }
          .signature-label {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="voucher">
          <div class="header">
            <div class="company-name">${companyName}</div>
            <div class="voucher-title">Comprobante de Pago</div>
            <div class="payment-period">Décimo Tercer Mes - ${monthNames[paymentMonth]} ${year}</div>
          </div>

          <div class="employee-section">
            <h3>EMPLEADO</h3>
            <div class="employee-name">${employee.nombre} ${employee.apellido}</div>
            <div class="employee-id">Cédula: ${employee.cedula}</div>
          </div>

          <div class="payment-details">
            <div class="detail-row">
              <span class="detail-label">Concepto</span>
              <span class="detail-value">Décimo Tercer Mes ${year}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Cuota</span>
              <span class="detail-value">${installmentNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Mes de Pago</span>
              <span class="detail-value">${monthNames[paymentMonth]} ${year}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Monto Total Anual</span>
              <span class="detail-value">$${calculation.montoTotal.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ISR Anual</span>
              <span class="detail-value">-$${calculation.isr.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="total-section">
            <div class="total-label">MONTO A PAGAR</div>
            <div class="total-amount">$${paymentAmount.toLocaleString("es-PA", { minimumFractionDigits: 2 })}</div>
            <div class="installment-info">Cuota ${installmentNumber} del monto neto total</div>
          </div>

          <div class="signature-section">
            <div class="signature-line"></div>
            <div class="signature-label">Firma del Empleado - Recibí Conforme</div>
          </div>

          <div class="footer">
            <p>Generado el ${new Date().toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p>Comprobante válido como constancia de pago</p>
          </div>
        </div>
      </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `comprobante-decimo-${paymentMonth}-${employee.cedula}-${year}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
