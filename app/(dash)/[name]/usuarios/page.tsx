"use client"

import { useState } from "react"
import { useUsers } from "@/lib/user-context"
import { PlusCircle, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { User } from "@/lib/types" 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog" 
import { Separator } from "@/components/ui/separator"
import { UserDialog } from "@/components/user-dialog" 
import { usePayroll } from "@/lib/payroll-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function UsuariosPage() {
  const { users, unlinkUserFromCompany, isLoading } = useUsers()
  const { currentCompany, currentUser } = usePayroll(); 
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const handleUnlink = async (id: string) => {
    try {
      await unlinkUserFromCompany(id)
    } catch (e) {
      console.error("Failed to unlink user:", e)
    }
  }

  if (isLoading) {
    return <div className="p-8"><div className="text-center py-20">Cargando datos de usuarios...</div></div>
  }

  if (!currentCompany) {
    return <div className="p-8"><div className="text-center py-20 text-muted-foreground">Por favor, seleccione una compañía para gestionar los usuarios.</div></div>
  }

  return (
    <TooltipProvider>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <div className="space-x-2">
              <Button onClick={() => { setEditingUser(null); setIsDialogOpen(true) }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Asignar Usuario
              </Button>
          </div>
        </div>
        <Separator className="mb-6" />

        <UserDialog 
          isOpen={isDialogOpen} 
          setIsOpen={setIsDialogOpen} 
          userToEdit={editingUser} 
          setUserToEdit={setEditingUser}
        />

        <Card>
          <CardHeader>
            <CardTitle>Listado de Usuarios ({users.length})</CardTitle>
            <CardDescription>
              Usuarios asociados a {currentCompany.nombre}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No hay usuarios asignados a esta compañía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol (Global)</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Compañías Asignadas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isCurrentUser = user.id === currentUser?.id; 
                      const allAssignedCompanies = user.companias || [];
                      
                      return (
                        <TableRow key={user.id} className={`font-medium ${isCurrentUser ? "bg-blue-100" : ""}`}>
                          <TableCell className={`font-medium`}>
                            {user.nombre}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">(Yo)</span>
                            )}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {/* @ts-ignore */}
                              {user.rol.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {/* @ts-ignore */}
                            <Badge variant={user.activo ? "default" : "secondary"}>
                              {/* @ts-ignore */}
                              {user.activo ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          
                          {/* --- 3. CELDA CORREGIDA --- */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {allAssignedCompanies.map(company => {
                                // Comprobamos si esta es la compañía actual
                                const isCurrentCompany = company.id === currentCompany.id;
                                return (
                                  <Tooltip key={company.id}>
                                    <TooltipTrigger>
                                      <Badge 
                                        // Usamos 'default' (sólido) para la actual, 'secondary' (gris) para las otras
                                        variant={isCurrentCompany ? "default" : "secondary"} 
                                        className="cursor-default"
                                      >
                                        {company.nombre}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{company.nombre}{isCurrentCompany && " (Actual)"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                              {allAssignedCompanies.length === 0 && (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right space-x-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={isCurrentUser ? -1 : 0}>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleEdit(user)}
                                    disabled={isCurrentUser}
                                    style={isCurrentUser ? { pointerEvents: "none" } : {}}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isCurrentUser ? "No puedes editarte a ti mismo" : "Editar usuario"}
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={isCurrentUser ? -1 : 0}>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        disabled={isCurrentUser}
                                        style={isCurrentUser ? { pointerEvents: "none" } : {}}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Desvincular a {user.nombre} de {currentCompany.nombre}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción quitará el acceso de este usuario a ESTA compañía. El usuario no será eliminado del sistema y mantendrá acceso a sus otras compañías.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          className="bg-red-600 hover:bg-red-700" 
                                          onClick={() => handleUnlink(user.id)}
                                        >
                                          Confirmar Desvinculación
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isCurrentUser ? "No puedes desvincularte a ti mismo" : "Desvincular usuario de esta compañía"}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}