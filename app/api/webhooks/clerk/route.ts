// Contenido para: app/api/webhooks/clerk/route.ts

import { Webhook } from 'svix'
import { headers } from 'next/headers'
// Ajusta esta ruta a donde tengas tu cliente Prisma (probablemente @/lib/db/db)
import { db } from '@/lib/db/db' 
import { clerkClient, WebhookEvent } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  // 1. Obtener el secreto del Webhook desde tus variables de entorno (.env.local)
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Por favor añade CLERK_WEBHOOK_SECRET a tu .env')
  }

  // 2. Validar la firma del Webhook
  const headerPayload = headers()
  const svix_id = (await headerPayload).get("svix-id")
  const svix_timestamp = (await headerPayload).get("svix-timestamp")
  const svix_signature = (await headerPayload).get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Faltan cabeceras svix', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verificando webhook:', err)
    return new Response('Error: Webhook inválido', { status: 400 })
  }

  // 3. Obtener el tipo de evento
  const eventType = evt.type

  // ---
  // 4. ¡ACCIÓN PRINCIPAL! Manejar la creación de usuario
  // ---
  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    
    // Asigna un rol por defecto. 
    // Puedes cambiar esto a 'admin' o lo que necesites.
    const defaultRole = 'user'

    try {
      // 4a. Crear el usuario en tu base de datos Prisma
      await db.user.create({
        data: {
          clerkId: id, //
          email: email_addresses[0].email_address,
          nombre: `${first_name || ''} ${last_name || ''}`.trim() || 'Usuario Nuevo',
          image: image_url, //
          rol: defaultRole, //
        },
      })
      
      console.log(`Usuario ${id} creado en Prisma con rol: ${defaultRole}`)

      // 4b. ¡AQUÍ ES DONDE SE GUARDA EL ROL EN CLERK!
      // Sincroniza el rol de tu DB con los metadatos de Clerk
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          role: defaultRole 
        }
      })
      
      console.log(`Metadatos de Clerk actualizados para ${id} con rol: ${defaultRole}`)

    } catch (e) {
       console.error('Error creando usuario en DB o actualizando Clerk:', e)
       return new Response('Error procesando user.created', { status: 500 })
    }
  }
  
  // (Opcional pero recomendado: maneja actualizaciones y borrados)
  // ...

  return new Response('Webhook procesado', { status: 200 })
}