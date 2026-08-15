"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getAuthErrorMessage } from "@/lib/auth-errors"
import { getClientAuthCallbackUrl } from "@/lib/auth-redirect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface ResendVerificationFormProps {
  initialEmail?: string
}

export function ResendVerificationForm({ initialEmail = "" }: ResendVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (!isSupabaseConfigured()) {
        setError("Authentication is not configured for this deployment.")
        return
      }

      if (!email.trim()) {
        setError("Enter the email address you used to sign up.")
        return
      }

      const supabase = createClient()
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: getClientAuthCallbackUrl(),
        },
      })

      if (resendError) throw resendError

      setSuccess("Verification email sent. Check your inbox and spam folder.")
    } catch (resendFailure) {
      setError(getAuthErrorMessage(resendFailure))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleResend} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="resendEmail">Email address</Label>
        <Input
          id="resendEmail"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
      {success && <div className="text-sm text-green-800 bg-green-50 border border-green-200 p-3 rounded-md">{success}</div>}

      <Button type="submit" variant="outline" className="w-full bg-transparent" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Resend verification email
      </Button>
    </form>
  )
}
