"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePayroll } from "@/lib/payroll-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ISRBracket } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2 } from "lucide-react"

interface ISRBracketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ISRBracketDialog({ open, onOpenChange }: ISRBracketDialogProps) {
  const { isrBrackets, updateISRBrackets } = usePayroll()
  const { toast } = useToast()
  const [brackets, setBrackets] = useState<ISRBracket[]>([])

  useEffect(() => {
    if (open) {
      setBrackets(JSON.parse(JSON.stringify(isrBrackets)))
    }
  }, [isrBrackets, open])

  const handleAddBracket = () => {
    const newBracket: ISRBracket = {
      id: Math.random().toString(36).substring(2),
      desde: 0,
      hasta: null,
      porcentaje: 0,
      deduccionFija: 0,
    }
    setBrackets([...brackets, newBracket])
  }

  const handleRemoveBracket = (id: string) => {
    setBrackets(brackets.filter((b) => b.id !== id))
  }

  const handleBracketChange = (id: string, field: keyof ISRBracket, value: number | null) => {
    setBrackets(brackets.map((b) => (b.id === id ? { ...b, [field]: value } : b)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Sort brackets by "desde" value
    const sortedBrackets = [...brackets].sort((a, b) => a.desde - b.desde)

    updateISRBrackets(sortedBrackets)
    toast({
      title: "Tramos ISR actualizados",
      description: "Los tramos del ISR han sido actualizados correctamente",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tramos ISR</DialogTitle>
          <DialogDescription>Configure los tramos y tasas del Impuesto Sobre la Renta</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {brackets.map((bracket, index) => (
              <div key={bracket.id} className="grid grid-cols-5 gap-4 items-end p-4 border border-border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor={`desde-${bracket.id}`}>Desde</Label>
                  <Input
                    id={`desde-${bracket.id}`}
                    type="number"
                    step="0.01"
                    value={bracket.desde}
                    onChange={(e) => handleBracketChange(bracket.id, "desde", Number.parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`hasta-${bracket.id}`}>Hasta</Label>
                  <Input
                    id={`hasta-${bracket.id}`}
                    type="number"
                    step="0.01"
                    value={bracket.hasta || ""}
                    onChange={(e) =>
                      handleBracketChange(
                        bracket.id,
                        "hasta",
                        e.target.value ? Number.parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="En adelante"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`porcentaje-${bracket.id}`}>Porcentaje</Label>
                  <Input
                    id={`porcentaje-${bracket.id}`}
                    type="number"
                    step="0.01"
                    value={bracket.porcentaje}
                    onChange={(e) => handleBracketChange(bracket.id, "porcentaje", Number.parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`deduccion-${bracket.id}`}>Deducción Fija</Label>
                  <Input
                    id={`deduccion-${bracket.id}`}
                    type="number"
                    step="0.01"
                    value={bracket.deduccionFija}
                    onChange={(e) =>
                      handleBracketChange(bracket.id, "deduccionFija", Number.parseFloat(e.target.value))
                    }
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveBracket(bracket.id)}
                  disabled={brackets.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddBracket} className="w-full bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Tramo
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
