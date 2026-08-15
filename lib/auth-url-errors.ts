export interface AuthUrlError {
  error?: string | null
  errorCode?: string | null
  errorDescription?: string | null
}

export function parseAuthUrlError(search: string, hash: string): AuthUrlError | null {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash)

  const error = query.get("error") ?? fragment.get("error")
  const errorCode = query.get("error_code") ?? fragment.get("error_code")
  const errorDescription = query.get("error_description") ?? fragment.get("error_description")

  if (!error && !errorCode && !errorDescription) {
    return null
  }

  return { error, errorCode, errorDescription }
}

export function getAuthUrlErrorMessage({ error, errorCode, errorDescription }: AuthUrlError): string {
  const code = (errorCode ?? error ?? "").toLowerCase()
  const description = (errorDescription ?? "").toLowerCase()

  if (code === "otp_expired" || description.includes("expired")) {
    return "Your verification link has expired. Request a new verification email below."
  }

  if (code === "access_denied" && description.includes("expired")) {
    return "Your verification link has expired. Request a new verification email below."
  }

  if (code === "access_denied") {
    return "Email verification could not be completed. Request a new verification email or try signing in."
  }

  if (errorDescription) {
    return decodeURIComponent(errorDescription.replace(/\+/g, " "))
  }

  return "Authentication failed. Please try again."
}

export function authUrlErrorRedirectPath(authError: AuthUrlError): string {
  const code = (authError.errorCode ?? authError.error ?? "").toLowerCase()
  const description = (authError.errorDescription ?? "").toLowerCase()

  if (code === "otp_expired" || description.includes("expired")) {
    return "/auth/verify-email?error=otp_expired"
  }

  return `/auth/login?error=${encodeURIComponent(code || "auth_error")}`
}
