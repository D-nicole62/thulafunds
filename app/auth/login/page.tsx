import { AuthForm } from "@/components/auth/auth-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const initialError =
    error === "auth_callback_error"
      ? "Authentication failed. Please try signing in again."
      : undefined
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md">
        <AuthForm mode="login" initialError={initialError} />
      </div>
    </div>
  )
}
