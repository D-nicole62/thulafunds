import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Heart, Shield, Globe, Users } from "lucide-react"

export const metadata = {
  title: "About - Thula Funds",
  description: "Learn about Thula Funds — transparent crowdfunding on Stellar Soroban.",
}

export default function AboutPage() {
  const values = [
    {
      icon: Shield,
      title: "Transparency",
      description:
        "Every crypto donation is recorded on the Stellar blockchain. Supporters can verify where funds go.",
    },
    {
      icon: Heart,
      title: "Community First",
      description:
        "We help organizers raise money for education, healthcare, creative projects, and local causes.",
    },
    {
      icon: Globe,
      title: "Open Access",
      description:
        "Accept USDC from anywhere via Stellar wallets, or mobile money through Lipila in Zambia.",
    },
    {
      icon: Users,
      title: "Accountability",
      description:
        "Soroban smart-contract escrow holds funds until campaign rules are met — protecting donors and organizers.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b bg-muted/30 py-16 sm:py-24">
          <div className="container max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              About <span className="text-pink-500">Thula Funds</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Thula Funds is a modern crowdfunding platform built on Stellar. We combine familiar
              campaign tools with on-chain escrow so communities can fundraise with confidence.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container max-w-4xl space-y-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold">Our mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                We believe fundraising should be simple, transparent, and trustworthy. Thula Funds
                lets anyone launch a campaign, share their story, and receive support — while donors
                know their contributions are handled responsibly through Soroban smart contracts or
                direct Stellar payments.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you are backing a school project, a medical need, or a community initiative,
                Thula Funds gives you the tools to tell your story and reach supporters locally and
                globally.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {values.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="border-0 shadow-sm">
                  <CardContent className="p-6 space-y-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-16">
          <div className="container max-w-2xl text-center space-y-6">
            <h2 className="text-2xl font-bold">Ready to get started?</h2>
            <p className="text-muted-foreground">
              Launch your campaign in minutes or explore causes already raising on the platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/campaigns/create">
                <Button size="lg" className="group w-full sm:w-auto">
                  Start a Campaign
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  How it Works
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
