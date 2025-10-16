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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { LegalParameters } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface LegalParameterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parameter?: LegalParameters
}

export function LegalParameterDialog({ open, onOpenChange, parameter }: LegalParameterDialogProps) {
  const { addLegalParameter, updateLegalParameter } = usePayroll()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    nombre: "",
    tipo: "seguro_social_empleado" as
      | "seguro_social_empleado"
      | "seguro_social_empleador"
      | "seguro_educativo"
      | "otro",
    porcentaje: "",
    activo: true,
    fechaVigencia: "",
  })

  useEffect(() => {
    if (parameter) {
      setFormData({
        nombre: parameter.nombre,
        tipo: parameter.tipo,
        porcentaje: parameter.porcentaje.toString(),
        activo: parameter.activo,
        fechaVigencia: parameter.fechaVigencia,
      })
    } else {
      setFormData({
        nombre: "",
        tipo: "seguro_social_empleado",
        porcentaje: "",
        activo: true,
        fechaVigencia: new Date().toISOString().split("T")[0],
      })
    }
  }, [parameter, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre || !formData.porcentaje) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    const paramData = {
      nombre: formData.nombre,
      tipo: formData.tipo,
      porcentaje: Number.parseFloat(formData.porcentaje),
      activo: formData.activo,
      fechaVigencia: formData.fechaVigencia,
    }

    if (parameter) {
      updateLegalParameter(parameter.id, paramData)
      toast({
        title: "Parámetro actualizado",
        description: "El parámetro legal ha sido actualizado correctamente",
      })
    } else {
      addLegalParameter(paramData)
      toast({
        title: "Parámetro agregado",
        description: "El nuevo parámetro legal ha sido agregado al sistema",
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{parameter ? "Editar Parámetro Legal" : "Agregar Nuevo Parámetro"}</DialogTitle>
          <DialogDescription>
            {parameter ? "Modifique el parámetro legal" : "Complete el formulario para agregar un nuevo parámetro"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Seguro Social Empleado"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tipo}
                onValueChange={(value: typeof formData.tipo) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seguro_social_empleado">Seguro Social Empleado</SelectItem>
                  <SelectItem value="seguro_social_empleador">Seguro Social Empleador</SelectItem>
                  <SelectItem value="seguro_educativo">Seguro Educativo</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="porcentaje">
                Porcentaje <span className="text-destructive">*</span>
              </Label>
              <Input
                id="porcentaje"
                type="number"
                step="0.01"
                placeholder="9.75"
                value={formData.porcentaje}
                onChange={(e) => setFormData({ ...formData, porcentaje: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaVigencia">
                Fecha de Vigencia <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fechaVigencia"
                type="date"
                value={formData.fechaVigencia}
                onChange={(e) => setFormData({ ...formData, fechaVigencia: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="activo">Estado Activo</Label>
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{parameter ? "Actualizar" : "Agregar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
