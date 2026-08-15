const trimTrailingSlash = (url: string) => url.replace(/\/$/, "")

/** Public site origin for auth redirects (production should set NEXT_PUBLIC_APP_URL). */
export function getSiteOrigin(fallbackOrigin?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl && !isLocalhostUrl(appUrl)) {
    return trimTrailingSlash(appUrl)
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    return trimTrailingSlash(`https://${vercelUrl}`)
  }

  if (fallbackOrigin) {
    return trimTrailingSlash(fallbackOrigin)
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

function isLocalhostUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}

/** Prefer production URL in the browser when env is set (avoids localhost in prod emails). */
export function getClientAuthCallbackUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl && !isLocalhostUrl(appUrl)) {
    return `${trimTrailingSlash(appUrl)}/auth/callback`
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`
  }

  return getAuthCallbackUrl()
}
