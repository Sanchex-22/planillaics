import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { auth } from '@clerk/nextjs/server'; // Asumiendo Clerk para auth

// GET /api/users?companiaId=...
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const url = new URL(request.url);
    const companiaId = url.searchParams.get('companiaId');

    if (!companiaId) {
      return NextResponse.json({ error: 'Missing companiaId' }, { status: 400 });
    }

    // Aquí necesitarías lógica para verificar si el usuario tiene permiso
    // para ver los usuarios de esta compañía.

    const users = await db.user.findMany({
      where: {
        companias: {
          some: {
            id: companiaId,
          },
        },
      },
      // Excluir hashedPassword u otros datos sensibles
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        clerkId: true,
        image: true,
        createdAt: true,
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users
export async function POST(request: Request) {
    // ... Lógica para crear un nuevo usuario asociado a una compañía ...
    // (Similar a la creación de empleados, necesitarías recibir companiaId)
    return NextResponse.json({ message: 'User creation logic not implemented' }, { status: 501 });
}