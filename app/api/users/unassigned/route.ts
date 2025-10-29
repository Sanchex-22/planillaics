import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { auth } from '@clerk/nextjs/server';

// GET /api/users/unassigned?companiaId=...
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

    // Buscar usuarios que NO están en la lista de esta compañía
    const users = await db.user.findMany({
      where: {
        companias: {
          none: {
            id: companiaId,
          },
        },
      },
      select: { // Solo devolver lo necesario
        id: true,
        nombre: true,
        email: true,
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching unassigned users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}