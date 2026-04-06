import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isSupabaseConfigured } from "@/lib/supabase/env"

const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/products",
  "/pdv",
  "/cash",
  "/sales",
  "/inventory",
  "/entries",
  "/adjustments",
  "/transfers",
  "/units",
  "/locations",
  "/stock-locations",
  "/customers",
  "/services",
  "/suppliers",
  "/categories",
  "/financial",
  "/accounts-payable",
  "/accounts-receivable",
  "/service-orders",
  "/purchase-orders",
  "/returns",
  "/reports",
  "/fiscal",
  "/settings",
]

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requiresSessionCheck = pathname === "/login" || isProtectedRoute(pathname)

  if (!requiresSessionCheck) {
    return NextResponse.next()
  }

  if (!isSupabaseConfigured()) {
    if (!isProtectedRoute(pathname)) {
      return NextResponse.next()
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectedFrom", pathname)

    return NextResponse.redirect(redirectUrl)
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: "", maxAge: 0, ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectedFrom", pathname)

    return NextResponse.redirect(redirectUrl)
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    redirectUrl.search = ""

    return NextResponse.redirect(redirectUrl)
  }

  return response
}
