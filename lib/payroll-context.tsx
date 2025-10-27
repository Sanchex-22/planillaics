// File: lib/payroll-context.tsx (Modificado)

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { toast } from "@/components/ui/use-toast";
import {
  Company,
  Employee,
  LegalParameters,
  ISRBracket,
  PayrollEntry,
  DecimoTercerMes,
  SIPEPayment,
  User,
} from "./types";
import { apiFetcher } from "./utils";
import {
  PayrollCalculationInput,
  PayrollCalculationResult,
} from "./server-calculations";

// =================================================================
// 1. TYPING AND INITIAL STATE
// =================================================================

interface PayrollContextType {
  // Data States
  companies: Company[];
  currentCompany: Company | null;
  employees: Employee[];
  legalParameters: LegalParameters[];
  isrBrackets: ISRBracket[];
  payrollEntries: PayrollEntry[];
  decimoEntries: DecimoTercerMes[];
  sipePayments: SIPEPayment[];
  currentCompanyId: string | null;
  // Loading States
  isLoading: boolean;

  // States de Autenticación/Carga
  currentUser: User | null;
  isHydrated: boolean; // Ahora significa que los datos de la compañía están cargados

  // Filters
  currentPeriod: string;
  currentYear: number;

  // Actions
  setCurrentCompanyId: (companyId: string | null) => void;
  selectPeriod: (period: string) => void;
  selectYear: (year: number) => void;

  fetchCompanyData: (companiaId: string) => Promise<void>;

  // ... (El resto de tipos de CRUD y Cálculos no cambian)
  addCompany: (data: Omit<Company, 'id'>) => Promise<Company>
  updateCompany: (id: string, data: Partial<Company>) => Promise<Company>
  deleteCompany: (id: string) => Promise<void>
  
  addEmployee: (data: Omit<Employee, 'id'>) => Promise<Employee>
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<Employee>
  deleteEmployee: (id: string) => Promise<void>
  clearAllEmployees: () => Promise<void>

  addLegalParameter: (data: Omit<LegalParameters, 'id'>) => Promise<LegalParameters>
  updateLegalParameter: (id: string, data: Partial<LegalParameters>) => Promise<LegalParameters>
  deleteLegalParameter: (id: string) => Promise<void>

  updateISRBrackets: (brackets: Omit<ISRBracket, 'id'>[]) => Promise<void>
  
  savePayrollEntries: (entries: PayrollEntry[]) => Promise<PayrollEntry[]>
  deletePayrollEntry: (id: string) => Promise<void>
  deletePeriodPayroll: (period: string) => Promise<void>

  saveDecimoEntries: (entries: DecimoTercerMes[]) => Promise<DecimoTercerMes[]>
  deleteDecimoEntry: (id: string) => Promise<void>
  deleteYearDecimo: (year: number) => Promise<void>

  saveSIPEPayment: (data: Omit<SIPEPayment, 'id'>) => Promise<SIPEPayment>
  deleteSIPEPayment: (id: string) => Promise<void>

  calculatePayrollApi: (input: Omit<PayrollCalculationInput, 'legalParameters' | 'isrBrackets'> & { currentLegalParameters: LegalParameters[], currentISRBrackets: ISRBracket[] }) => Promise<PayrollCalculationResult>
  calculateDecimoApi: (employeeId: string, anio: number) => Promise<DecimoTercerMes>
  calculateSIPEApi: (periodo: string) => Promise<SIPEPayment>
}

// ... (initialContextValue y stubs NO_OP no cambian)
const NO_OP = () => { throw new Error("PayrollContext function called outside of provider. Check if component is wrapped."); };
const ASYNC_NO_OP = () => Promise.reject(new Error("PayrollContext async function called outside of provider."));

const initialContextValue: PayrollContextType = {
  companies: [],
  currentCompany: null,
  currentCompanyId: null,
  employees: [],
  legalParameters: [],
  isrBrackets: [],
  payrollEntries: [],
  decimoEntries: [],
  sipePayments: [],
  isLoading: false,
  currentUser: null,
  isHydrated: false,
  currentPeriod: new Date().toISOString().slice(0, 7),
  currentYear: new Date().getFullYear(),
  setCurrentCompanyId: NO_OP,
  selectPeriod: NO_OP,
  selectYear: NO_OP,
  fetchCompanyData: ASYNC_NO_OP as (companiaId: string) => Promise<void>, 
  addCompany: ASYNC_NO_OP,
  updateCompany: ASYNC_NO_OP,
  deleteCompany: ASYNC_NO_OP,
  addEmployee: ASYNC_NO_OP, 
  updateEmployee: ASYNC_NO_OP,
  deleteEmployee: ASYNC_NO_OP,
  clearAllEmployees: ASYNC_NO_OP,
  addLegalParameter: ASYNC_NO_OP,
  updateLegalParameter: ASYNC_NO_OP,
  deleteLegalParameter: ASYNC_NO_OP,
  updateISRBrackets: ASYNC_NO_OP,
  savePayrollEntries: ASYNC_NO_OP,
  deletePayrollEntry: ASYNC_NO_OP,
  deletePeriodPayroll: ASYNC_NO_OP,
  saveDecimoEntries: ASYNC_NO_OP,
  deleteDecimoEntry: ASYNC_NO_OP,
  deleteYearDecimo: ASYNC_NO_OP,
  saveSIPEPayment: ASYNC_NO_OP,
  deleteSIPEPayment: ASYNC_NO_OP,
  calculatePayrollApi: ASYNC_NO_OP,
  calculateDecimoApi: ASYNC_NO_OP,
  calculateSIPEApi: ASYNC_NO_OP,
};

const PayrollContext = createContext<PayrollContextType>(initialContextValue);

// =================================================================
// 2. PROVIDER COMPONENT
// =================================================================

// Nuevas props para recibir datos del Server Component (Layout)
interface PayrollProviderProps {
  children: React.ReactNode;
  initialUser: User | null;
  initialCompanies: Company[];
  currentCompanyId: string; // La compañía activa de la URL
}

export const PayrollProvider: React.FC<PayrollProviderProps> = ({
  children,
  initialUser,
  initialCompanies,
  currentCompanyId: activeCompanyId, // Renombramos la prop para usarla
}) => {
  // Los estados de usuario y compañías se inicializan con las props
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  
  // El ID de la compañía actual también viene de la prop
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(activeCompanyId);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [legalParameters, setLegalParameters] = useState<LegalParameters[]>([]);
  const [isrBrackets, setISRBrackets] = useState<ISRBracket[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [decimoEntries, setDecimoEntries] = useState<DecimoTercerMes[]>([]);
  const [sipePayments, setSIPEPayments] = useState<SIPEPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Para datos *dentro* de la compañía
  
  // isHydrated ahora significa que los datos iniciales (usuario/compañías) están listos
  const [isHydrated, setIsHydrated] = useState(true); // Siempre es true por las props

  const [currentPeriod, setCurrentPeriod] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const currentCompany = useMemo(
    () => companies.find((c) => c?.id === currentCompanyId) || null,
    [companies, currentCompanyId],
  );

  const getCompanyId = useCallback(() => {
    if (!currentCompanyId) {
      toast({
        title: "Advertencia",
        description: "Seleccione una compañía primero.",
        variant: "default",
      });
      return null;
    }
    return currentCompanyId;
  }, [currentCompanyId]);

  // ELIMINADO: fetchCurrentUser (ya no es necesario, viene del layout)
  // ELIMINADO: fetchAllCompanies (ya no es necesario, viene del layout)

  // Esta función sigue siendo VÁLIDA. Carga los datos *de* la compañía seleccionada.
  const fetchCompanyData = useCallback(
    async (companiaId: string) => {
      setIsLoading(true);
      try {
        const [employees, parameters, brackets, payrolls, decimos, sipes] =
          await Promise.all([
            apiFetcher<Employee[]>(`/api/employees`, {
              params: { companiaId },
            }),
            apiFetcher<LegalParameters[]>(`/api/legal-parameters`, {
              params: { companiaId },
            }),
            apiFetcher<ISRBracket[]>(`/api/isr-brackets`, {
              params: { companiaId },
            }),
            apiFetcher<PayrollEntry[]>(`/api/payroll-entries`, {
              params: { companiaId, periodo: currentPeriod.slice(0, 7) },
            }),
            apiFetcher<DecimoTercerMes[]>(`/api/decimo-entries`, {
              params: { companiaId, anio: currentYear },
            }),
            apiFetcher<SIPEPayment[]>(`/api/sipe-payments`, {
              params: { companiaId },
            }),
          ]);

        setEmployees(employees);
        setLegalParameters(parameters);
        setISRBrackets(brackets);
        setPayrollEntries(payrolls);
        setDecimoEntries(decimos);
        setSIPEPayments(sipes);
      } catch (e) {
        console.error(e);
        toast({
          title: "Error de Carga",
          description:
            "No se pudieron cargar los datos de la compañía seleccionada.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentPeriod, currentYear],
  );

  // ELIMINADO: useEffect de initialize(). Ya no es necesario.

  // Este useEffect es correcto. Carga los datos de la compañía cuando el ID cambia.
  useEffect(() => {
    // El 'localStorageKey' se sigue usando en tu código, así que lo mantenemos
    const localStorageKey = "planillaics:selectedCompanyId";

    if (currentCompanyId) {
      fetchCompanyData(currentCompanyId);
      localStorage.setItem(localStorageKey, currentCompanyId);
    } else {
      // Limpiar datos si no hay compañía (aunque el layout no debería permitirlo)
      setEmployees([]);
      setLegalParameters([]);
      setISRBrackets([]);
      setPayrollEntries([]);
      setDecimoEntries([]);
      setSIPEPayments([]);
      localStorage.removeItem(localStorageKey);
    }
  }, [currentCompanyId, fetchCompanyData]);

  // Este useEffect es correcto. Recarga los datos de planilla/décimo si cambia el filtro
  useEffect(() => {
    if (currentCompanyId) {
      apiFetcher<PayrollEntry[]>(`/api/payroll-entries`, {
        params: {
          companiaId: currentCompanyId,
          periodo: currentPeriod.slice(0, 7),
        },
      })
        .then(setPayrollEntries)
        .catch(console.error);

      apiFetcher<DecimoTercerMes[]>(`/api/decimo-entries`, {
        params: { companiaId: currentCompanyId, anio: currentYear },
      })
        .then(setDecimoEntries)
        .catch(console.error);
    }
  }, [currentCompanyId, currentPeriod, currentYear]);

  // =================================================================
  // 3. ACTION HANDLERS (CRUD API calls)
  // =================================================================

  // ATENCIÓN: Esta función ahora redirigirá la página
  const handleSelectCompany = (companyId: string | null) => {
    if (companyId) {
      // En lugar de solo setear el estado, redirigimos a la URL de esa compañía
      // El layout se encargará de recargar todo
      window.location.href = `/${companyId}/dashboard`;
    }
  };
  
  // NOTA: fetchAllCompanies ya no existe. Debemos actualizar las funciones CRUD
  // que dependían de él (addCompany, updateCompany, deleteCompany)
  
// --- Companies CRUD ---
  const addCompany = useCallback(async (data: Omit<Company, 'id'>) => {
    // ELIMINAMOS EL TRY...CATCH DE AQUÍ
    const newCompany = await apiFetcher<Company>("/api/companies", { method: "POST", data })
    setCompanies(prev => [...prev, newCompany]);
    // El toast de éxito se movió al diálogo
    return newCompany
  }, []) // Dependencia ya no incluye fetchAllCompanies

  const updateCompany = useCallback(async (id: string, data: Partial<Company>) => {
    // ELIMINAMOS EL TRY...CATCH DE AQUÍ
    const updatedCompany = await apiFetcher<Company>(`/api/companies/${id}`, { method: "PATCH", data })
    setCompanies(prev => prev.map(c => c.id === id ? updatedCompany : c));
    // El toast de éxito se movió al diálogo
    return updatedCompany
  }, []) // Dependencia ya no incluye fetchAllCompanies
  
  const deleteCompany = useCallback(async (id: string) => {
    try {
      await apiFetcher<void>(`/api/companies/${id}`, { method: "DELETE" })
      // Actualizamos el estado local
      setCompanies(prev => prev.filter(c => c.id !== id));
      toast({ title: "Compañía Eliminada", description: "La compañía ha sido eliminada.", variant: "default" })
      
      if (currentCompanyId === id) {
          // Si eliminamos la compañía activa, redirigimos (por ejemplo, a la página principal de selección)
          window.location.href = '/'; // O a la primera compañía que quede
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar la compañía.", variant: "destructive" })
      throw e
    }
  }, [currentCompanyId]) // Ya no depende de fetchAllCompanies

  // ... (El resto de funciones CRUD para Employees, LegalParameters, etc., no cambian)
  // ... (Ellas dependen de fetchCompanyData, lo cual es correcto)
  
  const selectPeriod = (period: string) => setCurrentPeriod(period)
  const selectYear = (year: number) => setCurrentYear(year)
  
  // --- Employees CRUD ---
  const addEmployee = useCallback(async (data: Omit<Employee, 'id'>) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const newEmployee = await apiFetcher<Employee>("/api/employees", { method: "POST", data: { ...data, companiaId } })
      await fetchCompanyData(companiaId) 
      toast({ title: "Empleado Agregado", description: `${newEmployee.nombre} ${newEmployee.apellido} ha sido agregado.`, variant: "default" })
      return newEmployee
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo agregar el empleado.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  const updateEmployee = useCallback(async (id: string, data: Partial<Employee>) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const updatedEmployee = await apiFetcher<Employee>(`/api/employees/${id}`, { method: "PATCH", data })
      await fetchCompanyData(companiaId) 
      toast({ title: "Empleado Actualizado", description: `${updatedEmployee.nombre} ${updatedEmployee.apellido} ha sido actualizado.`, variant: "default" })
      return updatedEmployee
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo actualizar el empleado.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  const deleteEmployee = useCallback(async (id: string) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      await apiFetcher<void>(`/api/employees/${id}`, { method: "DELETE" })
      await fetchCompanyData(companiaId) 
      toast({ title: "Empleado Eliminado", description: "El empleado ha sido eliminado.", variant: "default" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar el empleado.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])
  
  const clearAllEmployees = useCallback(async () => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      await apiFetcher<void>(`/api/employees`, { method: "DELETE", params: { companiaId } })
      await fetchCompanyData(companiaId) 
      toast({ title: "Empleados Eliminados", description: "Todos los empleados han sido eliminados.", variant: "default" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudieron eliminar los empleados.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  // --- Legal Parameters CRUD ---
  const addLegalParameter = useCallback(async (data: Omit<LegalParameters, 'id'>) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const newParam = await apiFetcher<LegalParameters>("/api/legal-parameters", { method: "POST", data: { ...data, companiaId } })
      await fetchCompanyData(companiaId) 
      toast({ title: "Parámetro Agregado", description: `${newParam.nombre} agregado.`, variant: "default" })
      return newParam
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo agregar el parámetro.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])
  
  const updateLegalParameter = useCallback(async (id: string, data: Partial<LegalParameters>) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const updatedParam = await apiFetcher<LegalParameters>(`/api/legal-parameters/${id}`, { method: "PATCH", data })
      await fetchCompanyData(companiaId) 
      toast({ title: "Parámetro Actualizado", description: `${updatedParam.nombre} actualizado.`, variant: "default" })
      return updatedParam
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo actualizar el parámetro.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  const deleteLegalParameter = useCallback(async (id: string) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      await apiFetcher<void>(`/api/legal-parameters/${id}`, { method: "DELETE" })
      await fetchCompanyData(companiaId) 
      toast({ title: "Parámetro Eliminado", description: "El parámetro legal ha sido eliminado.", variant: "default" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar el parámetro.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])
  
  // --- ISR Brackets CRUD ---
  const updateISRBrackets = useCallback(async (brackets: Omit<ISRBracket, 'id'>[]) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      await apiFetcher<void>("/api/isr-brackets", { method: "POST", data: { companiaId, brackets } })
      await fetchCompanyData(companiaId) 
      toast({ title: "Tramos ISR Actualizados", description: "La tabla de ISR ha sido actualizada correctamente.", variant: "default" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo actualizar la tabla de ISR.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])
  
  // --- Payroll Entries CRUD ---
  const savePayrollEntries = useCallback(async (entries: PayrollEntry[]) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const savedEntries = await apiFetcher<PayrollEntry[]>("/api/payroll-entries", { method: "POST", data: entries.map(e => ({...e, companiaId})) })
      await fetchCompanyData(companiaId) 
      toast({ title: "Planilla Guardada", description: `Se guardaron ${savedEntries.length} entradas de planilla.`, variant: "default" })
      return savedEntries
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo guardar la planilla.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  const deletePayrollEntry = useCallback(async (id: string) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      await apiFetcher<void>(`/api/payroll-entries/${id}`, { method: "DELETE" })
      await fetchCompanyData(companiaId) 
      toast({ title: "Entrada Eliminada", description: "La entrada de planilla ha sido eliminada.", variant: "default" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar la entrada de planilla.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])
  
  const deletePeriodPayroll = useCallback(async (period: string) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      await apiFetcher<void>(`/api/payroll-entries`, { method: "DELETE", params: { companiaId, periodo: period } })
      await fetchCompanyData(companiaId) 
      toast({ title: "Planilla Eliminada", description: `Todas las entradas del período ${period} han sido eliminadas.`, variant: "default" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar la planilla del período.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  // --- Décimo Entries CRUD ---
  const saveDecimoEntries = useCallback(async (entries: DecimoTercerMes[]) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const savedEntries = await apiFetcher<DecimoTercerMes[]>("/api/decimo-entries", { method: "POST", data: entries.map(e => ({...e, companiaId})) })
      await fetchCompanyData(companiaId) 
      toast({ title: "Décimo Guardado", description: `Se guardaron ${savedEntries.length} cálculos de décimo.`, variant: "default" })
      return savedEntries
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo guardar el cálculo de décimo.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  const deleteDecimoEntry = useCallback(async (id: string) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      await apiFetcher<void>(`/api/decimo-entries/${id}`, { method: "DELETE" })
      await fetchCompanyData(companiaId) 
      toast({ title: "Cálculo Eliminado", description: "El cálculo de décimo ha sido eliminado.", variant: "default" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar el cálculo de décimo.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  const deleteYearDecimo = useCallback(async (year: number) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      await apiFetcher<void>(`/api/decimo-entries`, { method: "DELETE", params: { companiaId, anio: year } })
      await fetchCompanyData(companiaId) 
      toast({ title: "Décimo Eliminado", description: `Todos los cálculos del año ${year} han sido eliminados.`, variant: "default" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar el décimo del año.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  // --- SIPE Payments CRUD ---
  const saveSIPEPayment = useCallback(async (data: Omit<SIPEPayment, 'id'>) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const newPayment = await apiFetcher<SIPEPayment>("/api/sipe-payments", { method: "POST", data: { ...data, companiaId } })
      await fetchCompanyData(companiaId) 
      toast({ title: "Pago SIPE Guardado", description: `El pago SIPE del período ${newPayment.periodo} ha sido guardado.`, variant: "default" })
      return newPayment
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo guardar el pago SIPE.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])
  
  const deleteSIPEPayment = useCallback(async (id: string) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      await apiFetcher<void>(`/api/sipe-payments/${id}`, { method: "DELETE" })
      await fetchCompanyData(companiaId) 
      toast({ title: "Pago SIPE Eliminado", description: "El pago SIPE ha sido eliminado.", variant: "default" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar el pago SIPE.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  // =================================================================
  // 4. CALCULATION HANDLERS (Sin cambios)
  // =================================================================

  const calculatePayrollApi = useCallback(async (input: Omit<PayrollCalculationInput, 'legalParameters' | 'isrBrackets'> & { currentLegalParameters: LegalParameters[], currentISRBrackets: ISRBracket[] }) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    
    const apiInput: PayrollCalculationInput = {
        ...input,
        legalParameters: input.currentLegalParameters,
        isrBrackets: input.currentISRBrackets,
    }
    
    try {
      const result = await apiFetcher<PayrollCalculationResult>("/api/calculations/payroll", { method: "POST", data: apiInput })
      return result
    } catch (e: any) {
      toast({ title: "Error de Cálculo", description: e.message || "No se pudo calcular la planilla.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId])

  const calculateDecimoApi = useCallback(async (empleadoId: string, anio: number) => {
      const companiaId = getCompanyId()
      if (!companiaId) throw new Error("No company selected.")
      try {
        const result = await apiFetcher<DecimoTercerMes>("/api/calculations/decimo", { 
            method: "POST", 
            data: { empleadoId, companiaId, anio } 
        })
        return result
      } catch (e: any) {
        toast({ title: "Error de Cálculo", description: e.message || "No se pudo calcular el Décimo.", variant: "destructive" })
        throw e
      }
  }, [getCompanyId]);
    
  const calculateSIPEApi = useCallback(async (periodo: string) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const result = await apiFetcher<SIPEPayment>("/api/calculations/sipe", { 
          method: "POST", 
          data: { companiaId, periodo } 
      })
      return result
    } catch (e: any) {
      toast({ title: "Error de Cálculo", description: e.message || "No se pudo calcular el pago SIPE.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId])

  // =================================================================
  // 5. CONTEXT VALUE
  // =================================================================

  const value: PayrollContextType = {
    // States
    companies,
    currentCompany,
    currentCompanyId,
    employees,
    legalParameters,
    isrBrackets,
    payrollEntries,
    decimoEntries,
    sipePayments,
    isLoading,
    currentUser,
    isHydrated,
    currentPeriod,
    currentYear,
    fetchCompanyData,

    // Actions
    setCurrentCompanyId: handleSelectCompany,
    selectPeriod,
    selectYear,

    // CRUD
    addCompany,
    updateCompany,
    deleteCompany,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    clearAllEmployees,
    addLegalParameter,
    updateLegalParameter,
    deleteLegalParameter,
    updateISRBrackets,
    savePayrollEntries,
    deletePayrollEntry,
    deletePeriodPayroll,
    saveDecimoEntries,
    deleteDecimoEntry,
    deleteYearDecimo,
    saveSIPEPayment,
    deleteSIPEPayment,

    // Calculations
    calculatePayrollApi,
    calculateDecimoApi,
    calculateSIPEApi,
  };

  return (
    <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>
  );
};

// =================================================================
// 6. HOOK (Sin cambios)
// =================================================================

export const usePayroll = () => {
  const context = useContext(PayrollContext);
  return context;
};