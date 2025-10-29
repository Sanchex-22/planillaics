import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { auth } from '@clerk/nextjs/server';

// Definir la jerarquía de roles
const roleHierarchy = {
  super_admin: 3,
  admin: 2,
  contador: 1,
  user: 0,
} as const; 

type Role = keyof typeof roleHierarchy;

// --- MÉTODO PATCH (Editar o Vincular) ---
export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    // 1. Obtener el usuario que HACE LA SOLICITUD
    const { userId: requestingClerkId } = await auth();
    if (!requestingClerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const requestingUser = await db.user.findUnique({
      where: { clerkId: requestingClerkId },
    });
    if (!requestingUser) {
      return new NextResponse("Forbidden: Usuario no encontrado en DB", { status: 403 });
    }

    // 2. VALIDACIÓN DE AUTO-EDICIÓN
    const userIdToUpdate = params.id;
    if (requestingUser.id === userIdToUpdate) {
      return NextResponse.json({ error: "No puede editarse a sí mismo." }, { status: 403 });
    }

    const requestingUserLevel = roleHierarchy[requestingUser.rol as Role] || 0;
    const data = await request.json();
    const { rol, activo, clerkId, companiaIdToLink }= data;

    // 3. VALIDACIÓN DE ROLES (Si se está cambiando el rol)
    if (rol) {
      const newRole = rol as Role;
      const newRoleLevel = roleHierarchy[newRole] || 0;

      if (newRole === 'super_admin' && requestingUser.rol !== 'super_admin') {
        return NextResponse.json({ error: "Solo un super_admin puede asignar este rol." }, { status: 403 });
      }
      if (newRoleLevel > requestingUserLevel) {
        return NextResponse.json({ error: "No puede asignar un rol superior al suyo." }, { status: 403 });
      }
      if (!companiaIdToLink) { 
        const targetUser = await db.user.findUnique({ where: { id: userIdToUpdate } });
        if (targetUser) {
          const targetUserCurrentLevel = roleHierarchy[targetUser.rol as Role] || 0;
          if (targetUserCurrentLevel >= requestingUserLevel && requestingUser.rol !== 'super_admin') {
             return NextResponse.json({ error: "No puede editar usuarios de nivel igual o superior." }, { status: 403 });
          }
        }
      }
    }

    let updatedUser;
    
    // --- INICIO DE LA CORRECCIÓN ---
    const includeCompaniaData = {
      companias: {
        select: {
          id: true,
          nombre: true,
        }
      }
    };
    // --- FIN DE LA CORRECCIÓN ---


    if (companiaIdToLink) {
      // Lógica para VINCULAR usuario a compañía
      updatedUser = await db.user.update({
        where: { id: userIdToUpdate },
        data: {
          rol: rol, // Asigna el rol global
          companias: {
            connect: { id: companiaIdToLink }
          }
        },
        include: includeCompaniaData // <--- AÑADIDO
      });
    } else {
      // Lógica para ACTUALIZAR un usuario existente
      const updateData: { 
        rol?: string, 
        activo?: boolean, 
        clerkId?: string | null 
      } = {};

      if (rol) updateData.rol = rol;
      if (activo !== undefined) updateData.activo = activo;
      if (clerkId !== undefined) {
        updateData.clerkId = clerkId === "" ? null : clerkId;
      }

      updatedUser = await db.user.update({
        where: { id: userIdToUpdate },
        data: updateData,
        include: includeCompaniaData // <--- AÑADIDO
      });
    }

    const { hashedPassword, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);

  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('clerkId')) {
      return NextResponse.json({ error: 'Ese Clerk ID ya está en uso por otro usuario.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al actualizar el usuario' }, { status: 500 });
  }
}

// --- MÉTODO DELETE (Desvincular) ---
// (Este método no necesita cambios, ya que solo devuelve un mensaje de éxito, 
// y el frontend simplemente elimina al usuario de la lista)
export async function DELETE(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const { userId: requestingClerkId } = await auth();
    if (!requestingClerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const requestingUser = await db.user.findUnique({
      where: { clerkId: requestingClerkId },
    });
    if (!requestingUser) {
      return new NextResponse("Forbidden: Usuario no encontrado en DB", { status: 403 });
    }

    const userIdToUnlink = params.id;
    if (requestingUser.id === userIdToUnlink) {
      return NextResponse.json({ error: "No puede desvincularse a sí mismo." }, { status: 403 });
    }
    
    const data = await request.json();
    const { companiaIdToUnlink } = data;

    if (!companiaIdToUnlink) {
        return NextResponse.json({ error: 'Missing companiaIdToUnlink' }, { status: 400 });
    }

    await db.user.update({
        where: { id: userIdToUnlink },
        data: {
            companias: {
                disconnect: { id: companiaIdToUnlink }
            }
        }
    });

    return NextResponse.json({ message: 'User unlinked successfully' });

  } catch (error) {
    console.error('Error unlinking user:', error);
    return NextResponse.json({ error: 'Error al desvincular el usuario' }, { status: 500 });
  }
}