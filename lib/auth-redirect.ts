const trimTrailingSlash = (url: string) => url.replace(/\/$/, "")

/** Canonical production origin for auth emails and callbacks. */
export const PRODUCTION_SITE_ORIGIN = "https://thulafunds.com"

function isLocalhostUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}

function isProductionHost(hostname: string): boolean {
  return hostname === "thulafunds.com" || hostname === "www.thulafunds.com"
}

function configuredProductionOrigin(): string | undefined {
  const candidates = [
    process.env.NEXT_PUBLIC_PRODUCTION_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]

  for (const candidate of candidates) {
    const value = candidate?.trim()
    if (value && !isLocalhostUrl(value)) {
      return trimTrailingSlash(value)
    }
  }

  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_SITE_ORIGIN
  }

  return undefined
}

/** Public site origin for auth redirects. Request host wins over env on server. */
export function getSiteOrigin(fallbackOrigin?: string): string {
  if (fallbackOrigin) {
    try {
      const hostname = new URL(fallbackOrigin).hostname
      if (isProductionHost(hostname)) {
        return PRODUCTION_SITE_ORIGIN
      }
      if (!isLocalhostUrl(fallbackOrigin)) {
        return trimTrailingSlash(fallbackOrigin)
      }
    } catch {
      // ignore invalid URL
    }
  }

  const production = configuredProductionOrigin()
  if (production) {
    return production
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    return trimTrailingSlash(`https://${vercelUrl}`)
  }

  if (typeof window !== "undefined") {
    return trimTrailingSlash(window.location.origin)
  }

  return "http://localhost:3000"
}

/** Supabase email confirmation / magic link redirect target. */
export function getAuthCallbackUrl(fallbackOrigin?: string): string {
  return `${getSiteOrigin(fallbackOrigin)}/auth/callback`
}

/** Browser signup/resend: never send localhost when user is on thulafunds.com. */
export function getClientAuthCallbackUrl(): string {
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location

    if (isProductionHost(hostname)) {
      return `${PRODUCTION_SITE_ORIGIN}/auth/callback`
    }

    if (!isLocalhostUrl(origin)) {
      return `${trimTrailingSlash(origin)}/auth/callback`
    }
  }

  const production = configuredProductionOrigin()
  if (production) {
    return `${production}/auth/callback`
  }

  if (typeof window !== "undefined") {
    return `${trimTrailingSlash(window.location.origin)}/auth/callback`
  }

  return getAuthCallbackUrl()
}

/** Supabase Dashboard → Authentication → URL Configuration (for setup help UI). */
export function getSupabaseAuthSettingsUrl(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!supabaseUrl) return null

  const match = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co\/?$/)
  if (!match?.[1]) return null

  return `https://supabase.com/dashboard/project/${match[1]}/auth/url-configuration`
}
