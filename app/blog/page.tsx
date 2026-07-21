import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Calendar } from "lucide-react"

export const metadata = {
  title: "Blog - Thula Funds",
  description: "News and updates from Thula Funds.",
}

const posts = [
  {
    slug: "welcome-to-thula-funds",
    title: "Welcome to Thula Funds",
    date: "2026-01-15",
    excerpt:
      "Introducing transparent crowdfunding on Stellar — Soroban escrow, USDC donations, and Lipila mobile money for Zambian supporters.",
    category: "Announcements",
  },
  {
    slug: "soroban-escrow-explained",
    title: "What is Soroban Escrow?",
    date: "2026-02-01",
    excerpt:
      "Learn how smart-contract escrow protects donors and organizers until a campaign reaches its goal or deadline.",
    category: "Guides",
  },
  {
    slug: "donate-with-lipila",
    title: "Donate with Mobile Money via Lipila",
    date: "2026-03-10",
    excerpt:
      "You do not need a crypto wallet to support campaigns. Lipila lets you pay with mobile money and card in ZMW.",
    category: "Guides",
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b bg-muted/30 py-16 sm:py-24">
          <div className="container max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Updates, guides, and stories from the Thula Funds community.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container max-w-3xl space-y-6">
            {posts.map((post) => (
              <Card key={post.slug} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(post.date).toLocaleDateString("en-ZM", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {post.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold">{post.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{post.excerpt}</p>
                </CardContent>
              </Card>
            ))}

            <p className="text-center text-sm text-muted-foreground pt-4">
              Full articles coming soon.{" "}
              <Link href="/contact" className="text-primary hover:underline">
                Contact us
              </Link>{" "}
              if you would like to share your campaign story.
            </p>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-12">
          <div className="container max-w-2xl text-center space-y-4">
            <p className="text-muted-foreground">Ready to launch your own campaign?</p>
            <Link href="/campaigns/create">
              <Button className="group">
                Start a Campaign
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
