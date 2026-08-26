import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-8 pb-20 sm:pt-16 sm:pb-28">
      <div className="container relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="gradient-text">Funding With Peace Of Mind</span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Create and support campaigns with complete transparency. Every contribution is tracked on-chain, ensuring
            trust and accountability in crowdfunding.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
            <Link href="/auth/signup">
              <Button size="lg" className="group w-full sm:w-auto">
                Start Your Campaign
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Explore Campaigns
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
