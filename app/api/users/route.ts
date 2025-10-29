import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { auth } from '@clerk/nextjs/server';

// GET /api/users?companiaId=...
// Obtiene todos los usuarios ASIGNADOS a una compañía específica
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

    const users = await db.user.findMany({
      where: {
        companias: {
          some: {
            id: companiaId,
          },
        },
      },
      // --- ESTA ES LA CLAVE ---
      include: {
        companias: {
          select: {
            id: true,
            nombre: true,
          }
        }
      }
      // ------------------------
    });

    const safeUsers = users.map(user => {
      const { hashedPassword, ...safeUser } = user;
      return safeUser;
    });

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}