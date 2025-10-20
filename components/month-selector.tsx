"use client"

import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface MonthSelectorProps {
  label: string
  // Hacemos el tipado más robusto
  selectedMonths: number[] | null | undefined 
  // Hacemos onChange opcional, pero la función debe manejar el caso de que no exista
  onChange?: (months: number[]) => void 
}

const MONTHS = [
  { value: 1, label: "Ene" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Abr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Ago" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dic" },
]

export function MonthSelector({ label, selectedMonths, onChange }: MonthSelectorProps) {
  // Garantizamos que `currentMonths` sea un array, usando selectedMonths || [] como respaldo.
  const currentMonths = selectedMonths || [];

  const handleToggleMonth = (month: number) => {
    // CORRECCIÓN: Verificar si onChange existe antes de llamarlo
    if (!onChange) return; 

    if (currentMonths.includes(month)) {
      onChange(currentMonths.filter((m) => m !== month))
    } else {
      onChange([...currentMonths, month].sort((a, b) => a - b))
    }
  }

  const handleSelectAll = () => {
    // CORRECCIÓN: Verificar si onChange existe antes de llamarlo
    if (!onChange) return; 

    if (currentMonths.length === 12) {
      onChange([]) 
    } else {
      onChange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) 
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        {/* Deshabilitar botón si no hay onChange, o al menos no lo hace fallar */}
        <button 
            type="button" 
            onClick={handleSelectAll} 
            className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:cursor-not-allowed"
            disabled={!onChange}
        >
          {currentMonths.length === 12 ? "Deseleccionar todos" : "Seleccionar todos"}
        </button>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {MONTHS.map((month) => (
          <div key={month.value} className="flex items-center space-x-2">
            <Checkbox
              id={`month-${month.value}`}
              checked={currentMonths.includes(month.value)}
              // Deshabilitar el checkbox si no hay onChange
              disabled={!onChange} 
              onCheckedChange={() => handleToggleMonth(month.value)}
            />
            <label
              htmlFor={`month-${month.value}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {month.label}
            </label>
          </div>
        ))}
      </div>
      {currentMonths.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {currentMonths.length} {currentMonths.length === 1 ? "mes seleccionado" : "meses seleccionados"}
        </p>
      )}
    </div>
  )
}
