import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResendVerificationForm } from "@/components/auth/resend-verification-form"
import { getAuthUrlErrorMessage } from "@/lib/auth-url-errors"
import { MailCheck } from "lucide-react"

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string; error?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email, error } = await searchParams
  const expiredMessage =
    error === "otp_expired" ? getAuthUrlErrorMessage({ errorCode: "otp_expired" }) : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              {email
                ? `We've sent a confirmation link to ${email}. Click it to verify your account and finish signing up.`
                : "We've sent you a confirmation link. Click it to verify your account and finish signing up."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expiredMessage && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {expiredMessage}
              </div>
            )}

            <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Didn't get the email?</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct address</li>
                <li>If the link opens localhost, request a new verification email below</li>
              </ul>
            </div>

            <ResendVerificationForm initialEmail={email ?? ""} />

            <Button asChild className="w-full">
              <Link href="/auth/login">Go to Sign In</Link>
            </Button>

            <div className="text-center text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
