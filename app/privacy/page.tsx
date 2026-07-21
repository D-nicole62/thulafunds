import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export const metadata = {
  title: "Privacy Policy - Thula Funds",
  description: "How Thula Funds collects, uses, and protects your information.",
}

const LAST_UPDATED = "21 July 2026"
const CONTACT_EMAIL = "nokuthulandhlovu115@gmail.com"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b bg-muted/30 py-12 sm:py-16">
          <div className="container max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="mt-4 text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="container max-w-3xl prose prose-neutral dark:prose-invert max-w-none space-y-8 text-muted-foreground">
            <div>
              <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
              <p className="mt-3 leading-relaxed">
                Thula Funds (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates a crowdfunding platform at
                thulafunds.com. This policy explains how we handle personal information when you use our website,
                create campaigns, or make donations.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">2. Information we collect</h2>
              <ul className="mt-3 list-disc pl-6 space-y-2 leading-relaxed">
                <li>
                  <strong className="text-foreground">Account data:</strong> email address, name, and profile details
                  when you sign up via Supabase Auth.
                </li>
                <li>
                  <strong className="text-foreground">Campaign data:</strong> titles, descriptions, images, goals, and
                  wallet addresses you provide.
                </li>
                <li>
                  <strong className="text-foreground">Donation data:</strong> amounts, messages, transaction references,
                  and payment method (Stellar, Lipila, etc.).
                </li>
                <li>
                  <strong className="text-foreground">Blockchain data:</strong> public Stellar wallet addresses and
                  on-chain transaction hashes — these are publicly visible on the Stellar network.
                </li>
                <li>
                  <strong className="text-foreground">Usage data:</strong> browser type, pages visited, and general
                  analytics to improve the service.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">3. How we use your information</h2>
              <ul className="mt-3 list-disc pl-6 space-y-2 leading-relaxed">
                <li>To create and manage your account and campaigns</li>
                <li>To process and record donations</li>
                <li>To communicate with you about your account or support requests</li>
                <li>To improve platform security and prevent fraud</li>
                <li>To comply with legal obligations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">4. Third-party services</h2>
              <p className="mt-3 leading-relaxed">
                We use Supabase for authentication and database storage, Stellar/Soroban for on-chain transactions,
                Lipila for mobile money payments, and Vercel for hosting. Each provider has its own privacy policy
                governing how they handle data.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">5. Data retention</h2>
              <p className="mt-3 leading-relaxed">
                We retain account and campaign data while your account is active. Donation records may be kept for
                legal and accounting purposes. On-chain data cannot be deleted from the Stellar blockchain.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">6. Your rights</h2>
              <p className="mt-3 leading-relaxed">
                You may request access, correction, or deletion of your personal data by contacting us. Note that
                blockchain records and completed donation history may need to be retained.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
              <p className="mt-3 leading-relaxed">
                Questions about this policy? Email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>{" "}
                or visit our{" "}
                <Link href="/contact" className="text-primary hover:underline">
                  contact page
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
