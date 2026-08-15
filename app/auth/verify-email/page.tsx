import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResendVerificationForm } from "@/components/auth/resend-verification-form"
import { MailCheck } from "lucide-react"

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email } = await searchParams

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
            <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Didn't get the email?</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct address</li>
                <li>Wait a few minutes before requesting another email</li>
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
