import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Handle Supabase Session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isPlaceholder = !supabaseUrl || !supabaseAnonKey || supabaseAnonKey === "your-anon-key-here"

  if (isPlaceholder) {
    // During build/prerendering, if env vars are missing or placeholders, bypass Supabase logic
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2. Route Protection Logic
  const { pathname } = request.nextUrl

  // Protected Routes requiring Auth
  const authProtectedRoutes = ["/dashboard", "/campaigns/create", "/wallet"]
  const isAuthProtected = authProtectedRoutes.some(path => pathname.startsWith(path))

  if (isAuthProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // 3. x402 Payment Logic
  const paymentProtectedRoutes: Record<string, { price: number; description: string }> = {
    "/api/analytics/detailed": {
      price: 0.01,
      description: "Detailed campaign analytics",
    },
    "/api/campaigns/premium": {
      price: 0.005,
      description: "Premium campaign features",
    },
    "/api/campaigns/boost": {
      price: 0.02,
      description: "Boost campaign visibility",
    },
  }

  const route = paymentProtectedRoutes[pathname]
  if (route) {
    const paymentSession = request.headers.get("x-payment-session")
    const authHeader = request.headers.get("authorization")

    if (!paymentSession && !authHeader) {
      const response = new NextResponse("Payment Required", { status: 402 })
      response.headers.set("WWW-Authenticate", `Bearer realm="x402"`)
      response.headers.set("X-Accept-Payment", "USDC")
      response.headers.set("X-Payment-Amount", route.price.toString())
      response.headers.set("X-Payment-Network", "stellar")
      response.headers.set("X-Payment-Address", process.env.X402_WALLET_ADDRESS || "")
      response.headers.set("X-Payment-Description", route.description)
      response.headers.set(
        "Access-Control-Expose-Headers",
        "WWW-Authenticate, X-Accept-Payment, X-Payment-Amount, X-Payment-Network, X-Payment-Address",
      )
      return response
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
