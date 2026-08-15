import { createClient } from "@/lib/supabase/server"
import { getSiteOrigin } from "@/lib/auth-redirect"
import { authUrlErrorRedirectPath, parseAuthUrlError } from "@/lib/auth-url-errors"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const siteOrigin = getSiteOrigin(requestUrl.origin)
  const authError = parseAuthUrlError(requestUrl.search, "")

  if (authError) {
    return NextResponse.redirect(`${siteOrigin}${authUrlErrorRedirectPath(authError)}`)
  }

  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${siteOrigin}${next}`)
    }
    console.error("Auth callback exchangeCodeForSession error:", error.message)

    if (error.message.toLowerCase().includes("expired")) {
      return NextResponse.redirect(`${siteOrigin}/auth/verify-email?error=otp_expired`)
    }
  }

  return NextResponse.redirect(`${siteOrigin}/auth/login?error=auth_callback_error`)
}
