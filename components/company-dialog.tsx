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
import { Switch } from "@/components/ui/switch"
import type { Company } from "@/lib/types"

interface CompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company | null
  onClose: () => void
}

export function CompanyDialog({ open, onOpenChange, company, onClose }: CompanyDialogProps) {
  const { addCompany, updateCompany } = usePayroll()
  const [formData, setFormData] = useState({
    nombre: "",
    ruc: "",
    direccion: "",
    telefono: "",
    email: "",
    representanteLegal: "",
    activo: true,
  })

  useEffect(() => {
    if (company) {
      setFormData({
        nombre: company.nombre,
        ruc: company.ruc || "",
        direccion: company.direccion || "",
        telefono: company.telefono || "",
        email: company.email || "",
        representanteLegal: company.representanteLegal || "",
        activo: company.activo,
      })
    } else {
      setFormData({
        nombre: "",
        ruc: "",
        direccion: "",
        telefono: "",
        email: "",
        representanteLegal: "",
        activo: true,
      })
    }
  }, [company, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (company) {
      updateCompany(company.id, formData)
    } else {
      addCompany({
        ...formData,
        fechaCreacion: new Date().toISOString(),
      })
    }

    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{company ? "Editar Empresa" : "Nueva Empresa"}</DialogTitle>
          <DialogDescription>
            {company ? "Actualice la información de la empresa" : "Ingrese los datos de la nueva empresa"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Empresa *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruc">RUC</Label>
                <Input
                  id="ruc"
                  value={formData.ruc}
                  onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="representanteLegal">Representante Legal</Label>
              <Input
                id="representanteLegal"
                value={formData.representanteLegal}
                onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <Label htmlFor="activo">Empresa Activa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{company ? "Actualizar" : "Crear"} Empresa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
