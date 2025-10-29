"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { User } from "@/lib/types"
import { useUsers } from "@/lib/user-context"
import { usePayroll } from "@/lib/payroll-context" // <--- 1. Importar usePayroll
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { Spinner } from "./ui/spinner"
import { toast } from "./ui/use-toast"
import { Switch } from "./ui/switch"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { AlertCircle } from "lucide-react"

// Esquema Zod para Asignar (Crear)
const linkUserSchema = z.object({
  userId: z.string({ required_error: "Debes seleccionar un usuario." }),
  rol: z.enum(["super_admin", "admin", "contador", "user"], { required_error: "El rol es requerido." }),
})

// Esquema Zod para Editar
const editUserSchema = z.object({
  rol: z.enum(["super_admin", "admin", "contador", "user"], { required_error: "El rol es requerido." }),
  activo: z.boolean().default(true),
  clerkId: z.string().optional().or(z.literal("")),
})

const combinedSchema = z.union([linkUserSchema, editUserSchema]);

// --- 2. Definir Jerarquía (igual que en la API) ---
const roleHierarchy = {
  super_admin: 3,
  admin: 2,
  contador: 1,
  user: 0,
} as const;

type Role = keyof typeof roleHierarchy;
const allRoles: Role[] = ['super_admin', 'admin', 'contador', 'user'];
// ---

interface UserDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  userToEdit: User | null
  setUserToEdit: (user: User | null) => void
}

export function UserDialog({ isOpen, setIsOpen, userToEdit, setUserToEdit }: UserDialogProps) {
  const { unassignedUsers, fetchUnassignedUsers, linkUserToCompany, updateUser } = useUsers()
  const { currentUser } = usePayroll(); // <--- 3. Obtener el usuario actual (logueado)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditMode = !!userToEdit
  const isEditingSelf = isEditMode && userToEdit?.id === currentUser?.id;

  // --- 4. Determinar permisos del usuario actual ---
  const currentUserRole = (currentUser?.rol as Role) || 'user';
  const currentUserLevel = roleHierarchy[currentUserRole];

  // --- 5. Filtrar la lista de roles que este usuario puede asignar ---
  const assignableRoles = allRoles.filter(role => {
    const targetLevel = roleHierarchy[role];
    
    // Regla 1: Solo super_admin ve 'super_admin'
    if (role === 'super_admin') {
      return currentUserLevel === 3; // Nivel 3
    }
    
    // Regla 2: Solo se pueden asignar roles <= al nivel actual
    return targetLevel <= currentUserLevel;
  });
  // ---

  const form = useForm<z.infer<typeof combinedSchema>>({
    resolver: (data, context, options) => {
      if (isEditMode) {
        return zodResolver(editUserSchema)(data, context, options);
      }
      return zodResolver(linkUserSchema)(data, context, options);
    },
    defaultValues: {
      userId: "", 
      rol: "user",
      activo: true, 
      clerkId: "",
    },
  })

  useEffect(() => {
    if (isOpen && !isEditMode) {
      fetchUnassignedUsers();
    }
    
    if (isEditMode && userToEdit) {
      // Ensure the role coming from userToEdit is one of the allowed roles; fallback to 'user'
      const safeRole = allRoles.includes(userToEdit.rol as Role) ? (userToEdit.rol as Role) : 'user';
      form.reset({
        rol: safeRole,
        activo: !!userToEdit.activo,
        clerkId: userToEdit.clerkId || "",
      });
    } else {
      form.reset({
        userId: "",
        rol: "user", // Valor por defecto
        activo: true,
        clerkId: "",
      });
    }
  }, [isOpen, isEditMode, userToEdit, fetchUnassignedUsers, form])

  const onSubmit = async (values: z.infer<typeof combinedSchema>) => {
    setIsSubmitting(true)
    
    try {
      if (isEditMode && userToEdit) {
        const { rol, activo, clerkId } = values as z.infer<typeof editUserSchema>;
        // @ts-ignore
        await updateUser(userToEdit.id, { rol, activo, clerkId }); 
      } else {
        const { userId, rol } = values as z.infer<typeof linkUserSchema>;
        // @ts-ignore
        await linkUserToCompany(userId, rol);
      }
      
      form.reset()
      setUserToEdit(null)
      setIsOpen(false)
    } catch (error) {
      console.error("Error guardando usuario:", error)
      // El toast de error se maneja en el context, no es necesario duplicarlo aquí
    } finally {
      setIsSubmitting(false)
    }
  }

  // Determinar si el campo de rol debe estar deshabilitado
  let isRoleFieldDisabled = assignableRoles.length === 0;

  // Lógica para deshabilitar si se edita un usuario de nivel superior
  if (isEditMode && userToEdit) {
     // @ts-ignore
    const targetUserLevel = roleHierarchy[userToEdit.rol as Role] || 0;
    if (targetUserLevel >= currentUserLevel && currentUserLevel !== 3) {
      isRoleFieldDisabled = true;
    }
  }

return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) { setUserToEdit(null); form.reset(); }
      setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Usuario" : "Asignar Usuario a Compañía"}</DialogTitle>
        </DialogHeader>

        {/* 3. Mostrar alerta si se está auto-editando */}
        {isEditingSelf && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acción no permitida</AlertTitle>
            <AlertDescription>
              No puedes editar tu propio perfil de usuario desde esta pantalla.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            
            {/* ... (Campo 'Asignar Usuario' sin cambios) ... */}
            {!isEditMode && (
              <FormField
                control={form.control}
                name="userId"
                 render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario a Asignar *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un usuario..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {unassignedUsers.length === 0 && (<SelectItem value="-" disabled>No hay usuarios para asignar</SelectItem>)}
                        {unassignedUsers.map(user => (<SelectItem key={user.id} value={user.id}>{user.nombre} ({user.email})</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isEditMode && (
                <div className="space-y-2">
                    <FormLabel>Usuario</FormLabel>
                    <Input value={`${userToEdit?.nombre} (${userToEdit?.email})`} disabled />
                </div>
            )}

            {isEditMode && (
              <FormField
                control={form.control}
                name="clerkId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clerk ID (Opcional)</FormLabel>
                    <FormControl>
                      {/* 4. Deshabilitar campos si es auto-edición */}
                      <Input placeholder="user_2X... o déjelo vacío" {...field} disabled={isEditingSelf} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol en esta Compañía *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      // 4. Deshabilitar campos si es auto-edición
                      disabled={isRoleFieldDisabled || isEditingSelf} 
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {assignableRoles.map(role => (
                          <SelectItem key={role} value={role} className="capitalize">{role.replace('_', ' ')}</SelectItem>
                        ))}
                        {(isRoleFieldDisabled || isEditingSelf) && isEditMode && (
                          <SelectItem value={field.value} disabled>{field.value.replace('_', ' ')} (No se puede cambiar)</SelectItem>
                        )}
                        {assignableRoles.length === 0 && !isRoleFieldDisabled && (<SelectItem value="-" disabled>No tienes permisos</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditMode && (
                <FormField
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Estado</FormLabel>
                      <div className="flex items-center space-x-2 h-10">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            // 4. Deshabilitar campos si es auto-edición
                            disabled={isRoleFieldDisabled || isEditingSelf} 
                          />
                        </FormControl>
                        <FormLabel>{field.value ? "Activo" : "Inactivo"}</FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              {/* 5. Deshabilitar botón de guardar si es auto-edición */}
              <Button type="submit" disabled={isSubmitting || isEditingSelf}>
                {isSubmitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                {isEditMode ? "Guardar Cambios" : "Asignar Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}