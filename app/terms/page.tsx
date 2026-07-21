import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export const metadata = {
  title: "Terms of Service - Thula Funds",
  description: "Terms and conditions for using Thula Funds.",
}

const LAST_UPDATED = "21 July 2026"
const CONTACT_EMAIL = "nokuthulandhlovu115@gmail.com"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b bg-muted/30 py-12 sm:py-16">
          <div className="container max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="mt-4 text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="container max-w-3xl space-y-8 text-muted-foreground">
            <div>
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of terms</h2>
              <p className="mt-3 leading-relaxed">
                By accessing or using Thula Funds, you agree to these Terms of Service. If you do not agree, please do
                not use the platform.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">2. Platform description</h2>
              <p className="mt-3 leading-relaxed">
                Thula Funds is a crowdfunding platform that enables users to create campaigns and receive donations via
                Stellar (USDC), Soroban smart-contract escrow, and third-party payment providers such as Lipila. We
                provide technology tools — we are not a bank, escrow agent, or financial advisor.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">3. Campaign organizers</h2>
              <ul className="mt-3 list-disc pl-6 space-y-2 leading-relaxed">
                <li>You must provide accurate information about your campaign and use funds for the stated purpose.</li>
                <li>You are responsible for complying with local laws regarding fundraising and taxes.</li>
                <li>You must not create fraudulent, misleading, or illegal campaigns.</li>
                <li>You are responsible for securing your Stellar wallet and private keys.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">4. Donors and supporters</h2>
              <ul className="mt-3 list-disc pl-6 space-y-2 leading-relaxed">
                <li>Donations are voluntary. Review each campaign before contributing.</li>
                <li>Crypto donations on Stellar are generally irreversible once confirmed on-chain.</li>
                <li>Escrow and refund rules depend on the campaign&apos;s smart contract and deadline.</li>
                <li>Thula Funds does not guarantee that any campaign will reach its goal or use funds as promised.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">5. Fees and payments</h2>
              <p className="mt-3 leading-relaxed">
                Network fees (Stellar/XLM) and third-party payment fees (Lipila, etc.) may apply. Premium features such
                as campaign boosts may require separate payments. All fees are disclosed at the time of transaction.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">6. Prohibited use</h2>
              <p className="mt-3 leading-relaxed">
                You may not use Thula Funds for illegal activities, money laundering, scams, hate speech, or content
                that violates the rights of others. We may remove campaigns or suspend accounts that violate these terms.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">7. Limitation of liability</h2>
              <p className="mt-3 leading-relaxed">
                Thula Funds is provided &quot;as is&quot;. We are not liable for losses from blockchain transactions,
                wallet errors, smart-contract bugs, third-party payment failures, or organizer misconduct. Use the
                platform at your own risk.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">8. Changes</h2>
              <p className="mt-3 leading-relaxed">
                We may update these terms from time to time. Continued use of the platform after changes constitutes
                acceptance of the updated terms.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
              <p className="mt-3 leading-relaxed">
                For questions about these terms, contact{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>{" "}
                or call{" "}
                <a href="tel:+260971794359" className="text-primary hover:underline">
                  0971 794 359
                </a>
                . See also our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
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
