"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  authUrlErrorRedirectPath,
  parseAuthUrlError,
} from "@/lib/auth-url-errors"

/** Sends users to a helpful auth page when Supabase redirects with URL/hash errors. */
export function AuthLinkErrorHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return

    const authError = parseAuthUrlError(window.location.search, window.location.hash)
    if (!authError) return

    const target = authUrlErrorRedirectPath(authError)
    const targetPath = target.split("?")[0]

    if (pathname === targetPath) {
      window.history.replaceState({}, "", target)
      return
    }

    router.replace(target)
  }, [pathname, router])

  return null
}
