/** Map Supabase Auth errors to clearer user-facing messages. */
export function getAuthErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong. Please try again."

  const lower = raw.toLowerCase()

  if (raw.includes("signInWithPassword is not a function")) {
    return "Authentication is not configured for this deployment."
  }

  if (
    raw === "Failed to fetch" ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("fetch failed")
  ) {
    return "Can't reach the authentication server. The backend may be paused or misconfigured. Please try again shortly."
  }

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many verification emails were sent recently. Please wait about an hour before trying again, or sign in if you already verified your account."
  }

  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Try signing in instead."
  }

  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again."
  }

  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox for the verification link."
  }

  if (lower.includes("otp_expired") || lower.includes("invalid or has expired")) {
    return "Your verification link has expired. Request a new verification email."
  }

  return raw
}
