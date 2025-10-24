// File: lib/payroll-context.tsx (COMPLETO Y CORREGIDO PARA EVITAR TYPEERROR)

"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "@/components/ui/use-toast"
import { 
  Company, 
  Employee, 
  LegalParameters, 
  ISRBracket, 
  PayrollEntry, 
  DecimoTercerMes, 
  SIPEPayment, 
  User 
} from "./types"
import { apiFetcher } from "./utils"
import { PayrollCalculationInput, PayrollCalculationResult } from "./server-calculations" 

// =================================================================
// 1. TYPING AND INITIAL STATE
// =================================================================

interface PayrollContextType {
  // Data States
  companies: Company[]
  currentCompany: Company | null
  employees: Employee[]
  legalParameters: LegalParameters[]
  isrBrackets: ISRBracket[]
  payrollEntries: PayrollEntry[]
  decimoEntries: DecimoTercerMes[]
  sipePayments: SIPEPayment[]
  currentCompanyId: string | null
  // Loading States
  isLoading: boolean
  
  // States de Autenticación/Carga
  currentUser: User | null 
  isHydrated: boolean 

  // Filters
  currentPeriod: string
  currentYear: number

  // Actions
  setCurrentCompanyId: (companyId: string | null) => void 
  selectPeriod: (period: string) => void
  selectYear: (year: number) => void
  
  // FIX: Agregar la función al tipo de contexto (para que el componente la pueda desestructurar)
  fetchCompanyData: (companiaId: string) => Promise<void>; 

  // CRUD Operations
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

  // Calculation Operations (via API)
  calculatePayrollApi: (input: Omit<PayrollCalculationInput, 'legalParameters' | 'isrBrackets'> & { currentLegalParameters: LegalParameters[], currentISRBrackets: ISRBracket[] }) => Promise<PayrollCalculationResult>
  calculateDecimoApi: (employeeId: string, anio: number) => Promise<DecimoTercerMes>
  calculateSIPEApi: (periodo: string) => Promise<SIPEPayment>
}

// -----------------------------------------------------------------
// FUNCIÓN STUB Y VALOR INICIAL PARA EVITAR EL 'TypeError: is not a function'
// -----------------------------------------------------------------
const NO_OP = () => { throw new Error("PayrollContext function called outside of provider. Check if component is wrapped."); };
const ASYNC_NO_OP = () => Promise.reject(new Error("PayrollContext async function called outside of provider."));

const initialContextValue: PayrollContextType = {
  // Data States (valores iniciales)
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

  // Actions (TODAS las funciones deben ser definidas, aunque sea como stub)
  setCurrentCompanyId: NO_OP,
  selectPeriod: NO_OP,
  selectYear: NO_OP,
  // FIX: Stub para la nueva función de recarga
  fetchCompanyData: ASYNC_NO_OP as (companiaId: string) => Promise<void>, 

  // CRUD Operations (usamos ASYNC_NO_OP para funciones que devuelven Promise)
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

// Modificación: El contexto ahora usa el valor inicial tipado
const PayrollContext = createContext<PayrollContextType>(initialContextValue);

// =================================================================
// 2. FETCHING AND DATA REVALIDATION LOGIC
// =================================================================

const localStorageKey = "planillaics:selectedCompanyId"

export const PayrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [legalParameters, setLegalParameters] = useState<LegalParameters[]>([])
  const [isrBrackets, setISRBrackets] = useState<ISRBracket[]>([])
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([])
  const [decimoEntries, setDecimoEntries] = useState<DecimoTercerMes[]>([])
  const [sipePayments, setSIPEPayments] = useState<SIPEPayment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  const [currentUser, setCurrentUser] = useState<User | null>(null) 
  const [isHydrated, setIsHydrated] = useState(false) 


  const currentCompany = useMemo(
    () => companies.find((c) => c.id === currentCompanyId) || null,
    [companies, currentCompanyId],
  )
  
  const getCompanyId = useCallback(() => {
    if (!currentCompanyId) {
      toast({
        title: "Advertencia",
        description: "Seleccione una compañía primero.",
        variant: "default", // FIX TOAST
      })
      return null
    }
    return currentCompanyId
  }, [currentCompanyId])

  const fetchCurrentUser = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); 
    const mockUser: User = {
        id: "user-mock-123",
        nombre: "Usuario de Prueba",
        email: "test@planilla.com",
        rol: "super_admin", 
        companias: ["default-company-id"],
        activo: true,
    };
    setCurrentUser(mockUser);
    return mockUser;
  }, [])


  const fetchAllCompanies = useCallback(async () => {
    try {
      const data = await apiFetcher<Company[]>("/api/companies")
      setCompanies(data)
      return data;
    } catch (e) {
      console.error(e)
      toast({
        title: "Error de Carga",
        description: "No se pudieron cargar las compañías.",
        variant: "destructive",
      })
      return [];
    }
  }, [])

  // FIX: fetchCompanyData (función real para recargar datos específicos)
  const fetchCompanyData = useCallback(async (companiaId: string) => {
    setIsLoading(true)
    try {
      const [employees, parameters, brackets, payrolls, decimos, sipes] = await Promise.all([
        apiFetcher<Employee[]>(`/api/employees`, { params: { companiaId } }),
        apiFetcher<LegalParameters[]>(`/api/legal-parameters`, { params: { companiaId } }),
        apiFetcher<ISRBracket[]>(`/api/isr-brackets`, { params: { companiaId } }),
        apiFetcher<PayrollEntry[]>(`/api/payroll-entries`, { params: { companiaId, periodo: currentPeriod.slice(0, 7) } }),
        apiFetcher<DecimoTercerMes[]>(`/api/decimo-entries`, { params: { companiaId, anio: currentYear } }),
        apiFetcher<SIPEPayment[]>(`/api/sipe-payments`, { params: { companiaId } }),
      ])

      setEmployees(employees)
      setLegalParameters(parameters)
      setISRBrackets(brackets)
      setPayrollEntries(payrolls)
      setDecimoEntries(decimos)
      setSIPEPayments(sipes)
      
    } catch (e) {
      console.error(e)
      toast({
        title: "Error de Carga",
        description: "No se pudieron cargar los datos de la compañía seleccionada.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPeriod, currentYear]) // Dependencias para re-ejecutar si cambian los filtros de periodo

  // Efectos de Inicialización (sin cambios relevantes)
  
  useEffect(() => {
    async function initialize() {
      const user = await fetchCurrentUser();
      const companiesData = await fetchAllCompanies();
      
      const savedId = localStorage.getItem(localStorageKey);
      let initialCompanyId = savedId;
      
      if (!initialCompanyId && user && companiesData.length > 0) {
          initialCompanyId = companiesData[0].id;
      }
      
      if (initialCompanyId) {
          setCurrentCompanyId(initialCompanyId);
      }

      setIsHydrated(true); 
    }

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCurrentUser, fetchAllCompanies]);

  useEffect(() => {
    if (currentCompanyId) {
      fetchCompanyData(currentCompanyId)
      localStorage.setItem(localStorageKey, currentCompanyId)
    } else {
      setEmployees([])
      setLegalParameters([])
      setISRBrackets([])
      setPayrollEntries([])
      setDecimoEntries([])
      setSIPEPayments([])
      localStorage.removeItem(localStorageKey)
    }
  }, [currentCompanyId, fetchCompanyData])

  useEffect(() => {
    if (currentCompanyId) {
        apiFetcher<PayrollEntry[]>(`/api/payroll-entries`, { params: { companiaId: currentCompanyId, periodo: currentPeriod.slice(0, 7) } })
            .then(setPayrollEntries)
            .catch(console.error);

        apiFetcher<DecimoTercerMes[]>(`/api/decimo-entries`, { params: { companiaId: currentCompanyId, anio: currentYear } })
            .then(setDecimoEntries)
            .catch(console.error);
    }
  }, [currentCompanyId, currentPeriod, currentYear])

  // =================================================================
  // 3. ACTION HANDLERS (CRUD API calls)
  // =================================================================
  
  const handleSelectCompany = (companyId: string | null) => setCurrentCompanyId(companyId) 
  const selectPeriod = (period: string) => setCurrentPeriod(period)
  const selectYear = (year: number) => setCurrentYear(year)
  
  // --- Companies CRUD ---
  const addCompany = useCallback(async (data: Omit<Company, 'id'>) => {
    try {
      const newCompany = await apiFetcher<Company>("/api/companies", { method: "POST", data })
      await fetchAllCompanies()
      toast({ title: "Compañía Agregada", description: `La compañía ${newCompany.nombre} ha sido agregada.`, variant: "default" }) // FIX TOAST
      return newCompany
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo agregar la compañía.", variant: "destructive" })
      throw e
    }
  }, [fetchAllCompanies])

  const updateCompany = useCallback(async (id: string, data: Partial<Company>) => {
    try {
      const updatedCompany = await apiFetcher<Company>(`/api/companies/${id}`, { method: "PATCH", data })
      await fetchAllCompanies()
      toast({ title: "Compañía Actualizada", description: `La compañía ${updatedCompany.nombre} ha sido actualizada.`, variant: "default" }) // FIX TOAST
      return updatedCompany
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo actualizar la compañía.", variant: "destructive" })
      throw e
    }
  }, [fetchAllCompanies])
  
  const deleteCompany = useCallback(async (id: string) => {
    try {
      await apiFetcher<void>(`/api/companies/${id}`, { method: "DELETE" })
      if (currentCompanyId === id) {
          setCurrentCompanyId(null)
      }
      await fetchAllCompanies()
      toast({ title: "Compañía Eliminada", description: "La compañía ha sido eliminada.", variant: "default" }) // FIX TOAST
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar la compañía.", variant: "destructive" })
      throw e
    }
  }, [fetchAllCompanies, currentCompanyId])
  
  // --- Employees CRUD ---
  const addEmployee = useCallback(async (data: Omit<Employee, 'id'>) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const newEmployee = await apiFetcher<Employee>("/api/employees", { method: "POST", data: { ...data, companiaId } })
      await fetchCompanyData(companiaId) 
      toast({ title: "Empleado Agregado", description: `${newEmployee.nombre} ${newEmployee.apellido} ha sido agregado.`, variant: "default" }) // FIX TOAST
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
      toast({ title: "Empleado Actualizado", description: `${updatedEmployee.nombre} ${updatedEmployee.apellido} ha sido actualizado.`, variant: "default" }) // FIX TOAST
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
      toast({ title: "Empleado Eliminado", description: "El empleado ha sido eliminado.", variant: "default" }) // FIX TOAST
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
      toast({ title: "Empleados Eliminados", description: "Todos los empleados han sido eliminados.", variant: "default" }) // FIX TOAST
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudieron eliminar los empleados.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  // --- Legal Parameters CRUD --- (se mantienen las implementaciones)
  const addLegalParameter = useCallback(async (data: Omit<LegalParameters, 'id'>) => {
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const newParam = await apiFetcher<LegalParameters>("/api/legal-parameters", { method: "POST", data: { ...data, companiaId } })
      await fetchCompanyData(companiaId) 
      toast({ title: "Parámetro Agregado", description: `${newParam.nombre} agregado.`, variant: "default" }) // FIX TOAST
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
      toast({ title: "Parámetro Actualizado", description: `${updatedParam.nombre} actualizado.`, variant: "default" }) // FIX TOAST
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
      toast({ title: "Parámetro Eliminado", description: "El parámetro legal ha sido eliminado.", variant: "default" }) // FIX TOAST
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
      toast({ title: "Tramos ISR Actualizados", description: "La tabla de ISR ha sido actualizada correctamente.", variant: "default" }) // FIX TOAST
      // return void
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
      toast({ title: "Planilla Guardada", description: `Se guardaron ${savedEntries.length} entradas de planilla.`, variant: "default" }) // FIX TOAST
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
      toast({ title: "Entrada Eliminada", description: "La entrada de planilla ha sido eliminada.", variant: "default" }) // FIX TOAST
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
      toast({ title: "Planilla Eliminada", description: `Todas las entradas del período ${period} han sido eliminadas.`, variant: "default" }) // FIX TOAST
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
      toast({ title: "Décimo Guardado", description: `Se guardaron ${savedEntries.length} cálculos de décimo.`, variant: "default" }) // FIX TOAST
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
      toast({ title: "Cálculo Eliminado", description: "El cálculo de décimo ha sido eliminado.", variant: "default" }) // FIX TOAST
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
      toast({ title: "Décimo Eliminado", description: `Todos los cálculos del año ${year} han sido eliminados.`, variant: "default" }) // FIX TOAST
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
      toast({ title: "Pago SIPE Guardado", description: `El pago SIPE del período ${newPayment.periodo} ha sido guardado.`, variant: "default" }) // FIX TOAST
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
      toast({ title: "Pago SIPE Eliminado", description: "El pago SIPE ha sido eliminado.", variant: "default" }) // FIX TOAST
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar el pago SIPE.", variant: "destructive" })
      throw e
    }
  }, [getCompanyId, fetchCompanyData])

  // =================================================================
  // 4. CALCULATION HANDLERS (API calls to business logic)
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
  
// Archivo: lib/payroll-context.tsx

// 4. CALCULATION HANDLERS (API calls to business logic)
// FIX: Asegúrate de que los parámetros se definan y usen correctamente.

const calculateDecimoApi = useCallback(async (empleadoId: string, anio: number) => { // <-- Se define 'empleadoId' como parámetro
    const companiaId = getCompanyId()
    if (!companiaId) throw new Error("No company selected.")
    try {
      const result = await apiFetcher<DecimoTercerMes>("/api/calculations/decimo", { 
          method: "POST", 
          // FIX: Usar el parámetro 'empleadoId' y las variables de scope
          data: { empleadoId, companiaId, anio } 
      })
      return result
    } catch (e: any) {
      // FIX: Añadir manejo de errores
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
    // FIX: Añadir la función fetchCompanyData al valor del contexto
    fetchCompanyData,

    // Filters (CORREGIDO: usando el nombre de la interfaz)
    setCurrentCompanyId: handleSelectCompany, 
    selectPeriod,
    selectYear,

    // CRUD (usando los nombres de las implementaciones)
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
  }

  return <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>
}

// =================================================================
// 6. HOOK
// =================================================================

export const usePayroll = () => {
  const context = useContext(PayrollContext)
  // Eliminamos la verificación de 'undefined' ya que el valor inicial lo garantiza.
  return context 
}
