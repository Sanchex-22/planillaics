import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { auth } from '@clerk/nextjs/server';

// POST (Crear Compañía) - Lógica de permisos ya implementada
export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return new NextResponse("Forbidden: Usuario no encontrado", { status: 403 });
    }

    const isAdmin = user.rol === 'super_admin' || user.rol === 'admin';
    if (!isAdmin) {
      return new NextResponse("Forbidden: No tiene permisos para crear compañías", { status: 403 });
    }

    const data = await request.json();
    const { nombre, ruc, direccion, telefono, email, representanteLegal } = data;

    if (!nombre || !ruc) {
      return NextResponse.json({ error: 'Nombre y RUC son requeridos' }, { status: 400 });
    }

    const newCompany = await db.company.create({
      data: {
        nombre,
        ruc,
        direccion,
        telefono,
        email,
        representanteLegal,
        activo: true,
        users: {
          connect: { id: user.id }
        }
      },
    });

    return NextResponse.json(newCompany, { status: 201 });
  } catch (error: any) {
    console.error('Error creating company:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('ruc')) {
      return NextResponse.json({ error: 'El RUC ya está registrado' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}

// GET /api/companies (Obtener lista de compañías)
export async function GET(request: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId },
      include: { companias: true } // Incluir las compañías asignadas
    });

    if (!user) {
      return new NextResponse("Forbidden: Usuario no encontrado", { status: 403 });
    }

    // --- LÓGICA DE PERMISOS (GET) CORREGIDA ---
    if (user.rol === 'super_admin') {
      // Super Admin: Devolver TODAS las compañías
      const allCompanies = await db.company.findMany();
      return NextResponse.json(allCompanies);
    } else {
      // Admin, Contador, User: Devolver solo las compañías ASIGNADAS
      return NextResponse.json(user.companias);
    }
    // --- FIN DE LA LÓGICA DE PERMISOS (GET) ---

  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}