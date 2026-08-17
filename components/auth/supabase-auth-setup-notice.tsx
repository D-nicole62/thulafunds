import Link from "next/link"
import { getSupabaseAuthSettingsUrl } from "@/lib/auth-redirect"

export function SupabaseAuthSetupNotice() {
  const settingsUrl = getSupabaseAuthSettingsUrl()

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 space-y-2">
      <p className="font-medium">Links still open localhost?</p>
      <p>
        In Supabase, set <strong>Site URL</strong> to{" "}
        <code className="rounded bg-blue-100 px-1">https://www.thulafunds.com</code> (not localhost).
        Add{" "}
        <code className="rounded bg-blue-100 px-1">https://www.thulafunds.com/auth/callback</code> under
        Redirect URLs, then request a new verification email.
      </p>
      {settingsUrl ? (
        <Link
          href={settingsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          Open Supabase URL settings →
        </Link>
      ) : null}
    </div>
  )
}
