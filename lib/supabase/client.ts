import { createBrowserClient } from "@supabase/ssr"

const notConfiguredError = new Error(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
)

function createMockClient() {
    return {
        auth: {
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getUser: async () => ({ data: { user: null }, error: null }),
            signOut: async () => {},
            signInWithPassword: async () => ({ data: { user: null, session: null }, error: notConfiguredError }),
            signUp: async () => ({ data: { user: null, session: null }, error: notConfiguredError }),
            exchangeCodeForSession: async () => ({ data: { user: null, session: null }, error: notConfiguredError }),
        },
        storage: {
            from: () => ({
                upload: async () => ({ data: null, error: new Error("Mock Storage") }),
                getPublicUrl: () => ({ data: { publicUrl: "" } }),
            }),
        },
    } as ReturnType<typeof createBrowserClient>
}

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const isPlaceholder = !supabaseUrl || !supabaseAnonKey || supabaseAnonKey === "your-anon-key-here"

    if (isPlaceholder) {
        return createMockClient()
    }

    try {
        const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
        if (typeof client?.auth?.signInWithPassword !== "function") {
            return createMockClient()
        }
        return client
    } catch {
        return createMockClient()
    }
}
