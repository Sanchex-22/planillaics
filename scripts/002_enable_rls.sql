-- Enable Row Level Security on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decimo_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameters ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (we'll add proper auth later if needed)
-- These policies allow anyone to access the data
-- In production, you would restrict based on auth.uid()

CREATE POLICY "Allow all on companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on payroll_entries" ON public.payroll_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on decimo_calculations" ON public.decimo_calculations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on parameters" ON public.parameters FOR ALL USING (true) WITH CHECK (true);
