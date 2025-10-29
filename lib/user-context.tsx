"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { User } from '@/lib/types';
import { usePayroll } from './payroll-context';

// Definiendo el tipo parcial para la actualización
type UserUpdateData = Partial<Omit<User, 'id' | 'companias'>>; // Acepta rol, activo, clerkId, etc.

interface UserContextType {
  users: User[]; 
  unassignedUsers: User[]; 
  isLoading: boolean;
  fetchUsers: () => Promise<void>;
  fetchUnassignedUsers: () => Promise<void>;
  linkUserToCompany: (userId: string, rol: 'admin' | 'contador' | 'user') => Promise<void>;
  updateUser: (id: string, userData: UserUpdateData) => Promise<void>; // <-- RENOMBRADO Y ACTUALIZADO
  unlinkUserFromCompany: (id: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentCompany } = usePayroll();

  // ... (fetchUsers y fetchUnassignedUsers sin cambios) ...
  const fetchUsers = useCallback(async () => {
    if (!currentCompany?.id) {
        setUsers([]);
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users?companiaId=${currentCompany.id}`);
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  const fetchUnassignedUsers = useCallback(async () => {
    if (!currentCompany?.id) return;
    try {
      const res = await fetch(`/api/users/unassigned?companiaId=${currentCompany.id}`);
      if (!res.ok) throw new Error('Error al cargar usuarios no asignados');
      const data = await res.json();
      setUnassignedUsers(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudieron cargar los usuarios para asignar.", variant: "destructive" });
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ... (linkUserToCompany sin cambios) ...
  const linkUserToCompany = async (userId: string, rol: 'admin' | 'contador' | 'user') => {
    if (!currentCompany?.id) {
         toast({ title: "Error", description: "No hay compañía seleccionada.", variant: "destructive" });
         return;
    }
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            rol: rol, 
            companiaIdToLink: currentCompany.id 
        }),
      });
      if (!res.ok) throw new Error('Error al vincular usuario');
      const updatedUser = await res.json();
      setUsers((prev) => [...prev, updatedUser]);
      setUnassignedUsers((prev) => prev.filter((u) => u.id !== userId));
      toast({ title: "Usuario Asignado", description: "El usuario ha sido vinculado a esta compañía." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo vincular el usuario.", variant: "destructive" });
    }
  };


  // --- ACTUALIZADO: 'updateUserRole' ahora es 'updateUser' ---
  const updateUser = async (id: string, userData: UserUpdateData) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            ...userData, // <-- Pasa el objeto completo (rol, activo, clerkId)
            companiaIdToUpdate: currentCompany?.id // Contexto de compañía
        }),
      });
      if (!res.ok) throw new Error('Error al actualizar usuario');
      const updatedUser = await res.json();
      
      // Actualiza el estado local con los nuevos datos
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updatedUser } : u)));
      
      toast({ title: "Usuario Actualizado", description: "Los datos del usuario han sido guardados." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo actualizar el usuario.", variant: "destructive" });
    }
  };
  // --- FIN DE LA ACTUALIZACIÓN ---

  // ... (unlinkUserFromCompany sin cambios) ...
  const unlinkUserFromCompany = async (id: string) => {
    if (!currentCompany?.id) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companiaIdToUnlink: currentCompany.id })
      });
      if (!res.ok) throw new Error('Error al desvincular usuario');
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ title: "Usuario Desvinculado", description: "El usuario ha sido quitado de esta compañía." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo desvincular el usuario.", variant: "destructive" });
    }
  };

  return (
    <UserContext.Provider value={{ 
        users, 
        unassignedUsers, 
        isLoading, 
        fetchUsers, 
        fetchUnassignedUsers, 
        linkUserToCompany, 
        updateUser, // <-- EXPORTA EL NUEVO NOMBRE
        unlinkUserFromCompany 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers debe ser usado dentro de un UserProvider');
  }
  return context;
};