// File: app/api/companies/route.ts (Corregido)

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/db";
import { Prisma } from "@prisma/client"; // <--- 1. IMPORTA EL TIPO DE ERROR

// GET /api/companies - (Esta función está bien, no necesita cambios)
export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId },
      include: {
        companias: {
          orderBy: { nombre: 'asc' }
        },
      },
    });

    if (!user) {
      return new NextResponse("User not found in DB", { status: 404 });
    }

    return NextResponse.json(user.companias);

  } catch (error) {
    console.error("[COMPANIES_GET]", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

// POST /api/companies - (Esta función tiene el catch actualizado)
export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();
    const data = await request.json();

    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return new NextResponse("User not found in DB", { status: 404 });
    }

    // 3. Crear la compañía
    const newCompany = await db.company.create({
      data: {
        ...data,
        activo: data.activo ?? true,
        users: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    return NextResponse.json(newCompany, { status: 201 });

  } catch (error) {
    console.error("[COMPANIES_POST]", error);

    // --- 2. MANEJO DE ERROR ACTUALIZADO ---
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // El error 'P2002' es "Unique constraint failed"
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "Ya existe una compañía con este RUC." },
          { status: 409 } // 409 Conflict es más semántico que 400
        );
      }
    }

    // Si es cualquier otro error, devuelve 500
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}