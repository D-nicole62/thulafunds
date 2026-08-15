import { createClient } from "@/lib/supabase/server"
import { getSiteOrigin } from "@/lib/auth-redirect"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/dashboard"
  const siteOrigin = getSiteOrigin(requestUrl.origin)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${siteOrigin}${next}`)
    }
    console.error("Auth callback exchangeCodeForSession error:", error.message)
  }

  return NextResponse.redirect(`${siteOrigin}/auth/login?error=auth_callback_error`)
}
