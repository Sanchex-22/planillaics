"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button"; // Importa tu componente de botón

export function NoAccessPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
      <h1 className="text-2xl font-semibold mb-2">Acceso No Configurado</h1>
      <p className="text-muted-foreground max-w-sm mb-6">
        Tu cuenta está autenticada, pero no tiene un usuario o compañía
        asignada en este sistema.
      </p>
      <p className="text-muted-foreground max-w-sm mb-6">
        Por favor, <strong>contacte a un administrador</strong> para que
        configure su acceso.
      </p>

      <SignOutButton>
        <Button variant="outline">
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </SignOutButton>
    </div>
  );
}