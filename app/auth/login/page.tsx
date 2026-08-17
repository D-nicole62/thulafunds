import { AuthForm } from "@/components/auth/auth-form"
import { getAuthUrlErrorMessage } from "@/lib/auth-url-errors"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"
  let initialError: string | undefined

  if (error === "auth_callback_error") {
    initialError = "Authentication failed. Please try signing in again."
  } else if (error === "otp_expired") {
    initialError = getAuthUrlErrorMessage({ errorCode: "otp_expired" })
  } else if (error) {
    initialError = getAuthUrlErrorMessage({ errorCode: error })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md">
        <AuthForm mode="login" initialError={initialError} redirectTo={redirectTo} />
      </div>
    </div>
  )
}
