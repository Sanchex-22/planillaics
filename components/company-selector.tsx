"use client"

import { useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2 } from "lucide-react"

export function CompanySelector() {
  const { companies, currentCompanyId, setCurrentCompanyId, currentUser, isHydrated } = usePayroll()
  console.log("All Companies:", companies)
  // Filter companies based on user role and permissions
  const availableCompanies =
    currentUser?.rol === "super_admin" ? companies : companies.filter((c) => currentUser?.companias.includes(c.id))

  console.log("Available Companies:", availableCompanies)

  useEffect(() => {
    if (!isHydrated) return
    if (!currentCompanyId && availableCompanies.length > 0) {
      setCurrentCompanyId(availableCompanies[0].id)
    }
  }, [currentCompanyId, availableCompanies, setCurrentCompanyId, isHydrated])

  if (!isHydrated) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md animate-pulse">
        <Building2 className="h-4 w-4" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    )
  }

  if (availableCompanies.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>No hay empresas disponibles</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={currentCompanyId || undefined} onValueChange={setCurrentCompanyId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={currentCompanyId ? availableCompanies.find((c) => c.id === currentCompanyId)?.nombre : "Seleccione una compañía"} />
        </SelectTrigger>
        <SelectContent>
          {availableCompanies.map((company) => (
            <SelectItem key={company.id} value={company.id} defaultValue={company.id}>
              {company.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
