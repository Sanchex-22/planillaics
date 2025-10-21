import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "$0.00"
  }
  return value.toLocaleString("es-PA", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface FetcherOptions extends RequestInit {
  data?: any
  params?: Record<string, string | number | undefined>
}

export async function apiFetcher<T>(url: string, options: FetcherOptions = {}): Promise<T> {
  const { data, params, headers, ...rest } = options

  // 1. Construir URL con parámetros
  let fullUrl = url
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })
    if (searchParams.toString()) {
      fullUrl += `?${searchParams.toString()}`
    }
  }

  // 2. Configurar el cuerpo de la petición (si existe data y no es GET/HEAD)
  const isBodyAllowed = options.method !== 'GET' && options.method !== 'HEAD'
  let bodyContent = undefined
  if (data && isBodyAllowed) {
    bodyContent = JSON.stringify(data)
  }

  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: bodyContent,
    ...rest,
  })

  if (!response.ok) {
    let errorDetail = `HTTP error! Status: ${response.status}`
    try {
      const errorJson = await response.json()
      errorDetail = errorJson.error || errorJson.message || errorDetail
    } catch {
      // Si la respuesta no es JSON, usa el texto del estado
      errorDetail = response.statusText || errorDetail
    }
    console.error(`API Error on ${options.method} ${fullUrl}:`, errorDetail)
    throw new Error(`Error en la operación de la API: ${errorDetail}`)
  }
  
  // 3. Devolver JSON si existe contenido, o null/vacío
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json() as Promise<T>
  }
  
  return {} as T
}