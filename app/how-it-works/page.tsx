import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Wallet, Rocket, HandCoins, CheckCircle2 } from "lucide-react"

export const metadata = {
  title: "How it Works - Thula Funds",
  description: "How Thula Funds crowdfunding works — campaigns, Soroban escrow, and donations.",
}

const steps = [
  {
    step: "1",
    icon: Rocket,
    title: "Create your campaign",
    description:
      "Sign up, add your story, goal amount, deadline, and Stellar wallet. Upload an image and publish when you are ready.",
  },
  {
    step: "2",
    icon: Wallet,
    title: "Deploy on-chain escrow (optional)",
    description:
      "Connect Freighter on testnet and deploy a Soroban escrow contract. Donations then go into a smart contract until your goal or deadline.",
  },
  {
    step: "3",
    icon: HandCoins,
    title: "Receive donations",
    description:
      "Supporters contribute USDC through their Stellar wallet (Freighter, Albedo, or xBull) or pay with mobile money via Lipila.",
  },
  {
    step: "4",
    icon: CheckCircle2,
    title: "Funds released or refunded",
    description:
      "When a campaign succeeds, funds go to the organizer. If it expires without meeting the goal, donors can be refunded through the escrow contract.",
  },
]

const faqs = [
  {
    q: "Do I need a crypto wallet?",
    a: "Organizers need a Stellar wallet to receive funds. Donors can use Freighter or pay with Lipila mobile money without a wallet.",
  },
  {
    q: "What is Soroban escrow?",
    a: "A smart contract on Stellar that holds USDC until campaign rules are met. It adds an extra layer of trust for crypto donations.",
  },
  {
    q: "Can I donate without crypto?",
    a: "Yes. Lipila supports Zambian mobile money and card payments. Those donations are recorded in the campaign like on-chain gifts.",
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b bg-muted/30 py-16 sm:py-24">
          <div className="container max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">How it Works</h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              From launching a campaign to receiving your first donation — here is how Thula Funds
              works on Stellar.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container max-w-4xl">
            <div className="grid gap-8">
              {steps.map(({ step, icon: Icon, title, description }) => (
                <div key={step} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-white font-bold text-lg">
                    {step}
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold">{title}</h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30 border-y">
          <div className="container max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-10">Common questions</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {faqs.map(({ q, a }) => (
                <Card key={q} className="border-0 shadow-sm">
                  <CardContent className="p-6 space-y-2">
                    <h3 className="font-semibold">{q}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-2xl text-center space-y-6">
            <h2 className="text-2xl font-bold">Start fundraising today</h2>
            <p className="text-muted-foreground">
              Create your campaign or browse active causes on the platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="group w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/campaigns">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Browse Campaigns
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
