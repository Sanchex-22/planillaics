"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type {
  Company,
  User,
  Employee,
  LegalParameters,
  ISRBracket,
  PayrollEntry,
  DecimoTercerMes,
  SIPEPayment,
} from "./types"

interface PayrollContextType {
  companies: Company[]
  currentCompanyId: string | null
  currentUser: User | null
  setCurrentCompanyId: (id: string) => void
  addCompany: (company: Omit<Company, "id">) => void
  updateCompany: (id: string, company: Partial<Company>) => void

  // Existing state (now filtered by company)
  employees: Employee[]
  legalParameters: LegalParameters[]
  isrBrackets: ISRBracket[]
  payrollEntries: PayrollEntry[]
  decimoTercerMes: DecimoTercerMes[]
  sipePayments: SIPEPayment[]
  addEmployee: (employee: Omit<Employee, "id" | "companiaId">) => void
  updateEmployee: (id: string, employee: Partial<Employee>) => void
  deleteEmployee: (id: string) => void
  clearAllEmployees: () => void
  addLegalParameter: (param: Omit<LegalParameters, "id" | "companiaId">) => void
  updateLegalParameter: (id: string, param: Partial<LegalParameters>) => void
  addPayrollEntry: (entry: Omit<PayrollEntry, "id" | "companiaId">) => void
  updatePayrollEntry: (id: string, entry: Partial<PayrollEntry>) => void
  addDecimoTercerMes: (decimo: Omit<DecimoTercerMes, "id" | "companiaId">) => void
  updateISRBrackets: (brackets: Omit<ISRBracket, "companiaId">[]) => void
  addOrUpdateSIPEPayment: (payment: Omit<SIPEPayment, "companiaId">) => void
  updateSIPEPaymentStatus: (
    periodo: string,
    estado: "pendiente" | "pagado",
    fechaPago?: string,
    referenciaPago?: string,
  ) => void
  isHydrated: boolean
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined)

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)

const createDefaultISRBrackets = (companiaId: string): ISRBracket[] => [
  { id: generateId(), companiaId, desde: 0, hasta: 11000, porcentaje: 0, deduccionFija: 0 },
  { id: generateId(), companiaId, desde: 11000, hasta: 50000, porcentaje: 15, deduccionFija: 0 },
  { id: generateId(), companiaId, desde: 50000, hasta: null, porcentaje: 25, deduccionFija: 5850 },
]

const createDefaultLegalParameters = (companiaId: string): LegalParameters[] => [
  {
    id: generateId(),
    companiaId,
    nombre: "Seguro Social Empleado",
    tipo: "seguro_social_empleado",
    porcentaje: 9.75,
    activo: true,
    fechaVigencia: "2025-01-01",
  },
  {
    id: generateId(),
    companiaId,
    nombre: "Seguro Social Empleador",
    tipo: "seguro_social_empleador",
    porcentaje: 13.25,
    activo: true,
    fechaVigencia: "2025-01-01",
  },
  {
    id: generateId(),
    companiaId,
    nombre: "Seguro Educativo Empleado",
    tipo: "seguro_educativo",
    porcentaje: 1.25,
    activo: true,
    fechaVigencia: "2025-01-01",
  },
  {
    id: generateId(),
    companiaId,
    nombre: "Seguro Educativo Empleador",
    tipo: "seguro_educativo_empleador",
    porcentaje: 1.5,
    activo: true,
    fechaVigencia: "2025-01-01",
  },
  {
    id: generateId(),
    companiaId,
    nombre: "Riesgo Profesional",
    tipo: "riesgo_profesional",
    porcentaje: 0.98,
    activo: true,
    fechaVigencia: "2025-01-01",
  },
]

export function PayrollProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)

  const [companies, setCompanies] = useState<Company[]>([])
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [allLegalParameters, setAllLegalParameters] = useState<LegalParameters[]>([])
  const [allIsrBrackets, setAllIsrBrackets] = useState<ISRBracket[]>([])
  const [allPayrollEntries, setAllPayrollEntries] = useState<PayrollEntry[]>([])
  const [allDecimoTercerMes, setAllDecimoTercerMes] = useState<DecimoTercerMes[]>([])
  const [allSipePayments, setAllSipePayments] = useState<SIPEPayment[]>([])

  const employees = currentCompanyId ? allEmployees.filter((e) => e.companiaId === currentCompanyId) : []
  const legalParameters = currentCompanyId ? allLegalParameters.filter((p) => p.companiaId === currentCompanyId) : []
  const isrBrackets = currentCompanyId ? allIsrBrackets.filter((b) => b.companiaId === currentCompanyId) : []
  const payrollEntries = currentCompanyId ? allPayrollEntries.filter((e) => e.companiaId === currentCompanyId) : []
  const decimoTercerMes = currentCompanyId ? allDecimoTercerMes.filter((d) => d.companiaId === currentCompanyId) : []
  const sipePayments = currentCompanyId ? allSipePayments.filter((s) => s.companiaId === currentCompanyId) : []

  useEffect(() => {
    const loadData = () => {
      try {
        // Load companies
        const storedCompanies = localStorage.getItem("payroll_companies")
        if (storedCompanies) {
          const parsed = JSON.parse(storedCompanies)
          setCompanies(parsed)
          console.log("[v0] Loaded companies:", parsed.length)
        } else {
          // Create default company if none exists
          const defaultCompany: Company = {
            id: generateId(),
            nombre: "Mi Empresa",
            ruc: "",
            activo: true,
            fechaCreacion: new Date().toISOString(),
          }
          setCompanies([defaultCompany])
          localStorage.setItem("payroll_companies", JSON.stringify([defaultCompany]))
          console.log("[v0] Created default company")
        }

        // Load current user (mock for now - in production this would come from auth)
        const storedUser = localStorage.getItem("payroll_current_user")
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser))
        } else {
          // Create default super admin user
          const defaultUser: User = {
            id: generateId(),
            nombre: "Administrador",
            email: "admin@empresa.com",
            rol: "super_admin",
            companias: [], // Super admin has access to all companies
            activo: true,
          }
          setCurrentUser(defaultUser)
          localStorage.setItem("payroll_current_user", JSON.stringify(defaultUser))
        }

        // Load current company selection
        const storedCurrentCompany = localStorage.getItem("payroll_current_company_id")
        if (storedCurrentCompany) {
          setCurrentCompanyId(storedCurrentCompany)
        }

        // Load all data
        const storedEmployees = localStorage.getItem("payroll_employees")
        const storedParams = localStorage.getItem("payroll_legal_parameters")
        const storedISR = localStorage.getItem("payroll_isr_brackets")
        const storedPayroll = localStorage.getItem("payroll_entries")
        const storedDecimo = localStorage.getItem("payroll_decimo")
        const storedSipe = localStorage.getItem("payroll_sipe_payments")

        if (storedEmployees) {
          const parsed = JSON.parse(storedEmployees)
          console.log("[v0] Loaded employees:", parsed.length)
          setAllEmployees(parsed)
        }
        if (storedParams) {
          setAllLegalParameters(JSON.parse(storedParams))
        }
        if (storedISR) {
          setAllIsrBrackets(JSON.parse(storedISR))
        }
        if (storedPayroll) {
          const parsed = JSON.parse(storedPayroll)
          console.log("[v0] Loaded payroll entries:", parsed.length)
          setAllPayrollEntries(parsed)
        }
        if (storedDecimo) {
          setAllDecimoTercerMes(JSON.parse(storedDecimo))
        }
        if (storedSipe) {
          setAllSipePayments(JSON.parse(storedSipe))
        }
      } catch (error) {
        console.error("[v0] Error loading data from localStorage:", error)
      } finally {
        setIsHydrated(true)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (isHydrated && companies.length > 0) {
      localStorage.setItem("payroll_companies", JSON.stringify(companies))
    }
  }, [companies, isHydrated])

  useEffect(() => {
    if (isHydrated && currentCompanyId) {
      localStorage.setItem("payroll_current_company_id", currentCompanyId)
    }
  }, [currentCompanyId, isHydrated])

  // Save all data to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("payroll_employees", JSON.stringify(allEmployees))
    }
  }, [allEmployees, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("payroll_legal_parameters", JSON.stringify(allLegalParameters))
    }
  }, [allLegalParameters, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("payroll_isr_brackets", JSON.stringify(allIsrBrackets))
    }
  }, [allIsrBrackets, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("payroll_entries", JSON.stringify(allPayrollEntries))
    }
  }, [allPayrollEntries, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("payroll_decimo", JSON.stringify(allDecimoTercerMes))
    }
  }, [allDecimoTercerMes, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("payroll_sipe_payments", JSON.stringify(allSipePayments))
    }
  }, [allSipePayments, isHydrated])

  useEffect(() => {
    if (currentCompanyId && isHydrated) {
      const hasParams = allLegalParameters.some((p) => p.companiaId === currentCompanyId)
      const hasBrackets = allIsrBrackets.some((b) => b.companiaId === currentCompanyId)

      if (!hasParams) {
        const defaultParams = createDefaultLegalParameters(currentCompanyId)
        setAllLegalParameters((prev) => [...prev, ...defaultParams])
        console.log("[v0] Created default legal parameters for company:", currentCompanyId)
      }

      if (!hasBrackets) {
        const defaultBrackets = createDefaultISRBrackets(currentCompanyId)
        setAllIsrBrackets((prev) => [...prev, ...defaultBrackets])
        console.log("[v0] Created default ISR brackets for company:", currentCompanyId)
      }

      const riesgoProfParam = allLegalParameters.find(
        (p) => p.companiaId === currentCompanyId && p.tipo === "riesgo_profesional" && p.activo,
      )
      if (riesgoProfParam && riesgoProfParam.porcentaje === 0.56) {
        console.log("[v0] Updating Riesgo Profesional rate from 0.56% to 0.98%")
        setAllLegalParameters((prev) => prev.map((p) => (p.id === riesgoProfParam.id ? { ...p, porcentaje: 0.98 } : p)))
      }
    }
  }, [currentCompanyId, isHydrated, allLegalParameters, allIsrBrackets])

  const addCompany = (company: Omit<Company, "id">) => {
    const newCompany = { ...company, id: generateId() }
    setCompanies((prev) => [...prev, newCompany])
    console.log("[v0] Added company:", newCompany)
  }

  const updateCompany = (id: string, company: Partial<Company>) => {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...company } : c)))
  }

  const addEmployee = (employee: Omit<Employee, "id" | "companiaId">) => {
    if (!currentCompanyId) {
      console.error("[v0] Cannot add employee: no company selected")
      return
    }
    const newEmployee = { ...employee, id: generateId(), companiaId: currentCompanyId }
    console.log("[v0] Adding employee:", newEmployee)
    setAllEmployees((prev) => [...prev, newEmployee])
  }

  const updateEmployee = (id: string, employee: Partial<Employee>) => {
    setAllEmployees((prev) => prev.map((emp) => (emp.id === id ? { ...emp, ...employee } : emp)))
  }

  const deleteEmployee = (id: string) => {
    setAllEmployees((prev) => prev.filter((emp) => emp.id !== id))
  }

  const clearAllEmployees = () => {
    if (!currentCompanyId) {
      console.error("[v0] Cannot clear employees: no company selected")
      return
    }
    console.log("[v0] Clearing all employees for company:", currentCompanyId)
    // Remove all employees for current company
    setAllEmployees((prev) => prev.filter((emp) => emp.companiaId !== currentCompanyId))
    // Also clear related payroll entries
    setAllPayrollEntries((prev) => prev.filter((entry) => entry.companiaId !== currentCompanyId))
    // Clear décimo calculations
    setAllDecimoTercerMes((prev) => prev.filter((decimo) => decimo.companiaId !== currentCompanyId))
    // Clear SIPE payments
    setAllSipePayments((prev) => prev.filter((sipe) => sipe.companiaId !== currentCompanyId))
    console.log("[v0] All employee data cleared successfully")
  }

  const addLegalParameter = (param: Omit<LegalParameters, "id" | "companiaId">) => {
    if (!currentCompanyId) return
    const newParam = { ...param, id: generateId(), companiaId: currentCompanyId }
    setAllLegalParameters((prev) => [...prev, newParam])
  }

  const updateLegalParameter = (id: string, param: Partial<LegalParameters>) => {
    setAllLegalParameters((prev) => prev.map((p) => (p.id === id ? { ...p, ...param } : p)))
  }

  const addPayrollEntry = (entry: Omit<PayrollEntry, "id" | "companiaId">) => {
    if (!currentCompanyId) return
    const newEntry = { ...entry, id: generateId(), companiaId: currentCompanyId }
    console.log("[v0] Adding payroll entry:", newEntry)
    setAllPayrollEntries((prev) => [...prev, newEntry])
  }

  const updatePayrollEntry = (id: string, entry: Partial<PayrollEntry>) => {
    setAllPayrollEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...entry } : e)))
  }

  const addDecimoTercerMes = (decimo: Omit<DecimoTercerMes, "id" | "companiaId">) => {
    if (!currentCompanyId) return
    const newDecimo = { ...decimo, id: generateId(), companiaId: currentCompanyId }
    setAllDecimoTercerMes((prev) => [...prev, newDecimo])
  }

  const updateISRBrackets = (brackets: Omit<ISRBracket, "companiaId">[]) => {
    if (!currentCompanyId) return
    // Remove old brackets for this company and add new ones
    const otherBrackets = allIsrBrackets.filter((b) => b.companiaId !== currentCompanyId)
    const newBrackets = brackets.map((b) => ({ ...b, companiaId: currentCompanyId }))
    setAllIsrBrackets([...otherBrackets, ...newBrackets])
  }

  const addOrUpdateSIPEPayment = (payment: Omit<SIPEPayment, "companiaId">) => {
    if (!currentCompanyId) return

    const existingIndex = allSipePayments.findIndex(
      (p) => p.companiaId === currentCompanyId && p.periodo === payment.periodo,
    )

    if (existingIndex >= 0) {
      // Update existing payment
      setAllSipePayments((prev) =>
        prev.map((p, i) => (i === existingIndex ? { ...p, ...payment, companiaId: currentCompanyId } : p)),
      )
    } else {
      // Add new payment
      const newPayment = { ...payment, companiaId: currentCompanyId }
      setAllSipePayments((prev) => [...prev, newPayment])
    }
  }

  const updateSIPEPaymentStatus = (
    periodo: string,
    estado: "pendiente" | "pagado",
    fechaPago?: string,
    referenciaPago?: string,
  ) => {
    if (!currentCompanyId) return

    setAllSipePayments((prev) =>
      prev.map((p) =>
        p.companiaId === currentCompanyId && p.periodo === periodo ? { ...p, estado, fechaPago, referenciaPago } : p,
      ),
    )
  }

  return (
    <PayrollContext.Provider
      value={{
        companies,
        currentCompanyId,
        currentUser,
        setCurrentCompanyId,
        addCompany,
        updateCompany,
        employees,
        legalParameters,
        isrBrackets,
        payrollEntries,
        decimoTercerMes,
        sipePayments,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        clearAllEmployees,
        addLegalParameter,
        updateLegalParameter,
        addPayrollEntry,
        updatePayrollEntry,
        addDecimoTercerMes,
        updateISRBrackets,
        addOrUpdateSIPEPayment,
        updateSIPEPaymentStatus,
        isHydrated,
      }}
    >
      {children}
    </PayrollContext.Provider>
  )
}

export function usePayroll() {
  const context = useContext(PayrollContext)
  if (context === undefined) {
    throw new Error("usePayroll must be used within a PayrollProvider")
  }
  return context
}
