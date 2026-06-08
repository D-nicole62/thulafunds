import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
    let cookieStore: any;
    try {
        cookieStore = await cookies()
    } catch (e) {
        // cookies() can throw during static generation
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Handle missing or placeholder environment variables during build/prerendering
    const isPlaceholder = !supabaseUrl || !supabaseAnonKey || supabaseAnonKey === "your-anon-key-here"

    if (isPlaceholder) {
        const notConfigured = new Error("Supabase is not configured.")
        return {
            auth: {
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                getUser: async () => ({ data: { user: null }, error: null }),
                signOut: async () => { },
                exchangeCodeForSession: async () => ({ data: { user: null, session: null }, error: notConfigured }),
            },
            storage: {
                from: () => ({
                    upload: async () => ({ data: null, error: new Error("Mock Storage") }),
                    getPublicUrl: () => ({ data: { publicUrl: "" } }),
                }),
            },
        } as any
    }

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore?.getAll() || []
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore?.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
