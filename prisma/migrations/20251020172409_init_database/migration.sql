-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "representanteLegal" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "companias" TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companiaId" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "salarioBase" DOUBLE PRECISION NOT NULL,
    "departamento" TEXT,
    "cargo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "deduccionesBancarias" DOUBLE PRECISION,
    "mesesDeduccionesBancarias" INTEGER[],
    "prestamos" DOUBLE PRECISION,
    "mesesPrestamos" INTEGER[],
    "otrasDeduccionesPersonalizadas" JSONB,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalParameters" (
    "id" TEXT NOT NULL,
    "companiaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaVigencia" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalParameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ISRBracket" (
    "id" TEXT NOT NULL,
    "companiaId" TEXT NOT NULL,
    "desde" DOUBLE PRECISION NOT NULL,
    "hasta" DOUBLE PRECISION,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "deduccionFija" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ISRBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEntry" (
    "id" TEXT NOT NULL,
    "companiaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "tipoPeriodo" TEXT NOT NULL,
    "salarioBruto" DOUBLE PRECISION NOT NULL,
    "horasExtras" DOUBLE PRECISION NOT NULL,
    "bonificaciones" DOUBLE PRECISION NOT NULL,
    "otrosIngresos" DOUBLE PRECISION NOT NULL,
    "seguroSocialEmpleado" DOUBLE PRECISION NOT NULL,
    "seguroEducativo" DOUBLE PRECISION NOT NULL,
    "isr" DOUBLE PRECISION NOT NULL,
    "deduccionesBancarias" DOUBLE PRECISION,
    "prestamos" DOUBLE PRECISION,
    "otrasDeduccionesPersonalizadas" DOUBLE PRECISION NOT NULL,
    "otrasRetenciones" DOUBLE PRECISION NOT NULL,
    "salarioNeto" DOUBLE PRECISION NOT NULL,
    "fechaCalculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,
    "seguroSocialEmpleador" DOUBLE PRECISION NOT NULL,
    "seguroEducativoEmpleador" DOUBLE PRECISION NOT NULL,
    "riesgoProfesional" DOUBLE PRECISION NOT NULL,
    "fondoCesantia" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecimoTercerMes" (
    "id" TEXT NOT NULL,
    "companiaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "salarioPromedio" DOUBLE PRECISION NOT NULL,
    "mesesTrabajados" INTEGER NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "css" DOUBLE PRECISION NOT NULL,
    "cssPatrono" DOUBLE PRECISION NOT NULL,
    "isr" DOUBLE PRECISION NOT NULL,
    "totalDeducciones" DOUBLE PRECISION NOT NULL,
    "totalAportesPatronales" DOUBLE PRECISION NOT NULL,
    "montoNeto" DOUBLE PRECISION NOT NULL,
    "pagoAbril" DOUBLE PRECISION NOT NULL,
    "pagoAgosto" DOUBLE PRECISION NOT NULL,
    "pagoDiciembre" DOUBLE PRECISION NOT NULL,
    "fechaCalculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,

    CONSTRAINT "DecimoTercerMes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SIPEPayment" (
    "id" TEXT NOT NULL,
    "companiaId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "totalSeguroSocialEmpleado" DOUBLE PRECISION NOT NULL,
    "totalSeguroSocialEmpleador" DOUBLE PRECISION NOT NULL,
    "totalSeguroEducativoEmpleado" DOUBLE PRECISION NOT NULL,
    "totalSeguroEducativoEmpleador" DOUBLE PRECISION NOT NULL,
    "totalRiesgoProfesional" DOUBLE PRECISION NOT NULL,
    "totalFondoCesantia" DOUBLE PRECISION NOT NULL,
    "totalISR" DOUBLE PRECISION NOT NULL,
    "totalAPagar" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaPago" TIMESTAMP(3),
    "referenciaPago" TEXT,

    CONSTRAINT "SIPEPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_ruc_key" ON "Company"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companiaId_cedula_key" ON "Employee"("companiaId", "cedula");

-- CreateIndex
CREATE UNIQUE INDEX "LegalParameters_companiaId_nombre_fechaVigencia_key" ON "LegalParameters"("companiaId", "nombre", "fechaVigencia");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollEntry_empleadoId_periodo_key" ON "PayrollEntry"("empleadoId", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "DecimoTercerMes_empleadoId_anio_key" ON "DecimoTercerMes"("empleadoId", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "SIPEPayment_companiaId_periodo_key" ON "SIPEPayment"("companiaId", "periodo");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companiaId_fkey" FOREIGN KEY ("companiaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalParameters" ADD CONSTRAINT "LegalParameters_companiaId_fkey" FOREIGN KEY ("companiaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ISRBracket" ADD CONSTRAINT "ISRBracket_companiaId_fkey" FOREIGN KEY ("companiaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_companiaId_fkey" FOREIGN KEY ("companiaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecimoTercerMes" ADD CONSTRAINT "DecimoTercerMes_companiaId_fkey" FOREIGN KEY ("companiaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecimoTercerMes" ADD CONSTRAINT "DecimoTercerMes_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIPEPayment" ADD CONSTRAINT "SIPEPayment_companiaId_fkey" FOREIGN KEY ("companiaId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
