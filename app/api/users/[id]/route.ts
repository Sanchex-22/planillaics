import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { auth } from '@clerk/nextjs/server';

// PATCH /api/users/[id]
export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const { userId: requestingUserId } = await auth();
    if (!requestingUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const data = await request.json();
    const userIdToUpdate = params.id;

    // --- LÓGICA ACTUALIZADA ---
    // Destructuramos todos los campos posibles del body
    const { rol, activo, clerkId, companiaIdToLink } = data;

    let updatedUser;

    if (companiaIdToLink) {
      // Lógica para VINCULAR usuario a compañía
      updatedUser = await db.user.update({
        where: { id: userIdToUpdate },
        data: {
          rol: rol, // Asigna el rol
          companias: {
            connect: { id: companiaIdToLink }
          }
        },
      });
    } else {
      // Lógica para ACTUALIZAR un usuario existente
      
      // 1. Construir el payload de datos dinámicamente
      const updateData: { 
        rol?: string, 
        activo?: boolean, 
        clerkId?: string | null 
      } = {};

      if (rol) updateData.rol = rol;
      if (activo !== undefined) updateData.activo = activo;

      // 2. Manejar el clerkId (permite setear o limpiar)
      if (clerkId !== undefined) {
        // Si es un string vacío, lo seteamos a null en la DB
        updateData.clerkId = clerkId === "" ? null : clerkId;
      }

      // 3. Ejecutar la actualización en Prisma
      updatedUser = await db.user.update({
        where: { id: userIdToUpdate },
        data: updateData, // Pasa los datos dinámicos
      });
    }
    // --- FIN DE LA ACTUALIZACIÓN ---

    // Devolver solo datos seguros
    const { hashedPassword, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);

  } catch (error) {
    console.error('Error updating user:', error);
    // Manejo de error si el clerkId ya existe (Unique constraint)
    // @ts-ignore
    if (error.code === 'P2002' && error.meta?.target?.includes('clerkId')) {
      return NextResponse.json({ error: 'Ese Clerk ID ya está en uso por otro usuario.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// ... (El método DELETE para desvincular sigue igual) ...
export async function DELETE(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const { userId: requestingUserId } = await auth();
    if (!requestingUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const data = await request.json();
    const userIdToUnlink = params.id;
    const { companiaIdToUnlink } = data;

    if (!companiaIdToUnlink) {
        return NextResponse.json({ error: 'Missing companiaIdToUnlink' }, { status: 400 });
    }

    // Lógica para DESVINCULAR usuario de compañía
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
    return NextResponse.json({ error: 'Failed to unlink user' }, { status: 500 });
  }
}