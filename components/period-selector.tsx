// File: components/period-selector.tsx (NUEVO)

"use client"

import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface PeriodSelectorProps {
  selectedPeriod: string // YYYY-MM
  onPeriodChange: (period: string) => void
  mode?: 'month' | 'year'
}

const getPeriodOptions = (currentYear: number) => {
    const years = []
    for (let i = 0; i < 5; i++) {
        years.push(currentYear - i)
    }
    return years
}

export function PeriodSelector({ selectedPeriod, onPeriodChange, mode = 'month' }: PeriodSelectorProps) {
  const currentMonthDate = parse(selectedPeriod, mode === 'month' ? 'yyyy-MM' : 'yyyy', new Date())
  const currentYear = currentMonthDate.getFullYear()
  
  const handleNext = () => {
    const newDate = new Date(currentMonthDate)
    if (mode === 'month') {
        newDate.setMonth(currentMonthDate.getMonth() + 1)
        onPeriodChange(format(newDate, 'yyyy-MM'))
    } else {
        newDate.setFullYear(currentYear + 1)
        onPeriodChange(format(newDate, 'yyyy'))
    }
  }

  const handlePrev = () => {
    const newDate = new Date(currentMonthDate)
    if (mode === 'month') {
        newDate.setMonth(currentMonthDate.getMonth() - 1)
        onPeriodChange(format(newDate, 'yyyy-MM'))
    } else {
        newDate.setFullYear(currentYear - 1)
        onPeriodChange(format(newDate, 'yyyy'))
    }
  }

  const handleYearChange = (year: string) => {
    if (mode === 'year') {
        onPeriodChange(year)
    } else {
        const newDate = new Date(currentMonthDate)
        newDate.setFullYear(parseInt(year))
        onPeriodChange(format(newDate, 'yyyy-MM'))
    }
  }

  const formattedLabel = mode === 'month' 
    ? format(currentMonthDate, 'MMMM yyyy', { locale: es })
    : format(currentMonthDate, 'yyyy', { locale: es })


  if (mode === 'year') {
    // Si solo es modo año, usamos un selector simple con flechas
    return (
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={handlePrev} className="h-9 w-9">
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select onValueChange={handleYearChange} value={String(currentYear)}>
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                    {getPeriodOptions(new Date().getFullYear() + 1).map(year => (
                        <SelectItem key={year} value={String(year)}>
                            {year}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleNext} className="h-9 w-9">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
  }

  // Modo Mes (default)
  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="icon" onClick={handlePrev} className="h-9 w-9">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="font-medium text-sm w-36 text-center">{formattedLabel}</span>
      <Button variant="outline" size="icon" onClick={handleNext} className="h-9 w-9">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}