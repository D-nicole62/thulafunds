"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured, SUPABASE_NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/config"
import { getAuthErrorMessage } from "@/lib/auth-errors"
import { getClientAuthCallbackUrl } from "@/lib/auth-redirect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface AuthFormProps {
  mode: "login" | "signup"
  initialError?: string
  /** Path after successful login (default /dashboard). */
  redirectTo?: string
}

export function AuthForm({ mode, initialError, redirectTo = "/dashboard" }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError ?? "")
  const router = useRouter()

  useEffect(() => {
    setError(initialError ?? "")
  }, [initialError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!isSupabaseConfigured()) {
        setError(SUPABASE_NOT_CONFIGURED_MESSAGE)
        return
      }

      const supabase = createClient()
      const signIn = supabase.auth?.signInWithPassword
      const signUp = supabase.auth?.signUp
      if (typeof signIn !== "function" || typeof signUp !== "function") {
        setError(SUPABASE_NOT_CONFIGURED_MESSAGE)
        return
      }

      if (mode === "signup") {
        const { error } = await signUp.call(supabase.auth, {
          email,
          password,
          options: {
            emailRedirectTo: getClientAuthCallbackUrl(),
            data: {
              full_name: fullName,
            },
          },
        })
        if (error) throw error
        router.refresh()
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
      } else {
        const { error } = await signIn.call(supabase.auth, {
          email,
          password,
        })
        if (error) throw error
        const destination =
          redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard"
        // Full navigation so middleware sees the new session cookies.
        window.location.assign(destination)
        return
      }
    } catch (error: unknown) {
      const message = getAuthErrorMessage(error)
      if (message.includes("Authentication is not configured")) {
        setError(SUPABASE_NOT_CONFIGURED_MESSAGE)
        return
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
        <CardDescription>
          {mode === "login" ? (
            <>
              Sign in to your <span className="text-pink-500 font-medium">Thula Funds</span> account
              {redirectTo !== "/dashboard" && (
                <span className="block mt-1 text-xs">Sign in to continue to your dashboard.</span>
              )}
            </>
          ) : (
            "Start your crowdfunding journey today"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === "login" && (
              <div className="text-right">
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>
            )}
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm space-y-2">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </>
          )}
          <div className="pt-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
              ← Back to home
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
