import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { auth } from '@clerk/nextjs/server';

// GET (Obtener una compañía específica - sin cambios)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const companyId = params.id;
    const company = await db.company.findUnique({
      where: { id: companyId },
      // Opcional: include: { users: true } si necesitas ver los usuarios asignados
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Aquí puedes añadir lógica de permisos si solo ciertos usuarios pueden ver detalles
    // Por ejemplo, verificar si el usuario está asignado a esta compañía o es super_admin

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}


// PATCH (Actualizar una compañía - sin cambios)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verificar permisos (ej: solo admin/super_admin puede editar)
    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user || (user.rol !== 'admin' && user.rol !== 'super_admin')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const companyIdToUpdate = params.id;
    const data = await request.json();
    const { nombre, ruc, direccion, telefono, email, representanteLegal, activo } = data;

    const updatedCompany = await db.company.update({
      where: { id: companyIdToUpdate },
      data: {
        nombre,
        ruc,
        direccion,
        telefono,
        email,
        representanteLegal,
        activo,
      },
    });

    return NextResponse.json(updatedCompany);
  } catch (error: any) {
    console.error('Error updating company:', error);
     if (error.code === 'P2002' && error.meta?.target?.includes('ruc')) {
      return NextResponse.json({ error: 'El RUC ya está registrado' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}


// DELETE (Eliminar una compañía - CORREGIDO)
export async function DELETE(
  request: Request, // El objeto request sigue presente pero no se usará para el body
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verificar permisos (ej: solo super_admin puede eliminar)
    const requestingUser = await db.user.findUnique({ where: { clerkId } });
    if (!requestingUser || requestingUser.rol !== 'super_admin') {
       return NextResponse.json({ error: 'Forbidden: Only super admins can delete companies.' }, { status: 403 });
    }

    const companyIdToDelete = params.id;

    // --- LÍNEA REMOVIDA ---
    // const data = await request.json(); // <-- NO LEER BODY AQUÍ

    // Verificar si la compañía existe antes de intentar borrar
    const company = await db.company.findUnique({
      where: { id: companyIdToDelete },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Opcional: Añadir lógica para prevenir borrar la única compañía o una compañía activa, etc.

    // Realizar la eliminación usando el ID de los parámetros
    await db.company.delete({
      where: { id: companyIdToDelete },
    });

    // Devolver éxito (200 con mensaje o 204 sin contenido)
    return NextResponse.json({ message: 'Company deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error deleting company:', error);
    // Manejar errores específicos si es necesario (ej: foreign key constraints)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}