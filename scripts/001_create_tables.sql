-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ruc TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cedula TEXT NOT NULL,
  cargo TEXT,
  salario_base DECIMAL(10, 2) NOT NULL DEFAULT 0,
  fecha_ingreso DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, cedula)
);

-- Create payroll_entries table
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  salario_base DECIMAL(10, 2) NOT NULL,
  salario_bruto DECIMAL(10, 2) NOT NULL,
  horas_extras DECIMAL(10, 2) DEFAULT 0,
  bonificaciones DECIMAL(10, 2) DEFAULT 0,
  css DECIMAL(10, 2) NOT NULL,
  seguro_educativo DECIMAL(10, 2) NOT NULL,
  isr DECIMAL(10, 2) NOT NULL,
  otras_deducciones DECIMAL(10, 2) DEFAULT 0,
  salario_neto DECIMAL(10, 2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'procesado', 'pagado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, empleado_id, periodo)
);

-- Create decimo_calculations table
CREATE TABLE IF NOT EXISTS public.decimo_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  salario_promedio DECIMAL(10, 2) NOT NULL,
  meses_trabajados INTEGER NOT NULL,
  meses_detalle TEXT[] NOT NULL,
  monto_total DECIMAL(10, 2) NOT NULL,
  css DECIMAL(10, 2) NOT NULL DEFAULT 0,
  isr DECIMAL(10, 2) NOT NULL DEFAULT 0,
  monto_neto DECIMAL(10, 2) NOT NULL,
  pago_abril DECIMAL(10, 2) NOT NULL,
  pago_agosto DECIMAL(10, 2) NOT NULL,
  pago_diciembre DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, empleado_id, year)
);

-- Create parameters table
CREATE TABLE IF NOT EXISTS public.parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  css_rate DECIMAL(5, 2) NOT NULL DEFAULT 9.75,
  seguro_educativo_rate DECIMAL(5, 2) NOT NULL DEFAULT 1.25,
  isr_brackets JSONB NOT NULL DEFAULT '[
    {"min": 0, "max": 11000, "rate": 0},
    {"min": 11000, "max": 50000, "rate": 15},
    {"min": 50000, "max": null, "rate": 25}
  ]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employees_company ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_estado ON public.employees(estado);
CREATE INDEX IF NOT EXISTS idx_payroll_company ON public.payroll_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON public.payroll_entries(empleado_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periodo ON public.payroll_entries(periodo);
CREATE INDEX IF NOT EXISTS idx_decimo_company ON public.decimo_calculations(company_id);
CREATE INDEX IF NOT EXISTS idx_decimo_employee ON public.decimo_calculations(empleado_id);
CREATE INDEX IF NOT EXISTS idx_decimo_year ON public.decimo_calculations(year);
