// File: components/company-dialog.tsx (AJUSTADO)

"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Company } from "@/lib/types"
import { usePayroll } from "@/lib/payroll-context"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Spinner } from "./ui/spinner"


// Schema de validación
const companySchema = z.object({
  nombre: z.string().min(2, { message: "El nombre es requerido." }),
  ruc: z.string().min(5, { message: "El RUC es requerido." }),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email({ message: "Email inválido." }).optional().or(z.literal("")),
  representanteLegal: z.string().optional(),
  activo: z.boolean().default(true),
})

type CompanyFormValues = z.infer<typeof companySchema>

interface CompanyDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  companyToEdit: Company | null
  setCompanyToEdit: (company: Company | null) => void
}

export default function CompanyDialog({ isOpen, setIsOpen, companyToEdit, setCompanyToEdit }: CompanyDialogProps) {
  const { addCompany, updateCompany } = usePayroll()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      nombre: "",
      ruc: "",
      direccion: "",
      telefono: "",
      email: "",
      representanteLegal: "",
      activo: true,
    },
  })

  useEffect(() => {
    if (companyToEdit) {
      form.reset(companyToEdit)
    } else {
      form.reset()
    }
  }, [companyToEdit, form])

  const onSubmit = async (values: CompanyFormValues) => {
    setIsSubmitting(true)
    try {
      if (companyToEdit) {
        await updateCompany(companyToEdit.id, values) // <<-- Cambio: La llamada al contexto ahora es asíncrona
      } else {
        await addCompany(values) // <<-- Cambio: La llamada al contexto ahora es asíncrona
      }
      form.reset()
      setCompanyToEdit(null)
      setIsOpen(false)
    } catch (error) {
      console.error("Error saving company:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setCompanyToEdit(null); // Resetear al cerrar
        form.reset();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{companyToEdit ? "Editar Empresa" : "Nueva Empresa"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Form Fields... (omito por brevedad, pero usa los Field/Input como ya los tienes) */}
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Mi Compañía S.A." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ruc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUC/Dígito *</FormLabel>
                  <FormControl>
                    <Input placeholder="000-0-000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="representanteLegal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Representante Legal</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-2 pt-2">
              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        id="activo"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Label htmlFor="activo">Activa</Label>
            </div>


            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                {companyToEdit ? "Guardar Cambios" : "Crear Empresa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}