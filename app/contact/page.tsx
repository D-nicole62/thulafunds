import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, MessageCircle, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Contact - Thula Funds",
  description: "Get in touch with the Thula Funds team.",
}

const PHONE_DISPLAY = "0971 794 359"
const PHONE_TEL = "+260971794359"
const EMAIL = "nokuthulandhlovu115@gmail.com"

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b bg-muted/30 py-16 sm:py-24">
          <div className="container max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Contact Us</h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Have a question about campaigns, donations, or your account? We are here to help.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container max-w-4xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <h2 className="font-semibold text-lg">Phone</h2>
                  <p className="text-sm text-muted-foreground">Call or WhatsApp us</p>
                  <a
                    href={`tel:${PHONE_TEL}`}
                    className="text-primary font-medium hover:underline block"
                  >
                    {PHONE_DISPLAY}
                  </a>
                  <a
                    href={`https://wa.me/${PHONE_TEL.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat on WhatsApp
                  </a>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <h2 className="font-semibold text-lg">Email</h2>
                  <p className="text-sm text-muted-foreground">We typically reply within 1–2 business days</p>
                  <a
                    href={`mailto:${EMAIL}`}
                    className="text-primary font-medium hover:underline break-all"
                  >
                    {EMAIL}
                  </a>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm sm:col-span-2 lg:col-span-1">
                <CardContent className="p-6 space-y-3">
                  <h2 className="font-semibold text-lg">Support hours</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Monday – Friday, 9:00 AM – 5:00 PM (CAT)
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    For urgent campaign or payment issues, include your campaign link in your message.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 rounded-xl border bg-muted/30 p-8 text-center space-y-4">
              <h2 className="text-xl font-semibold">Looking for answers first?</h2>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                Many common questions about wallets, escrow, and donations are covered on our How it Works page.
              </p>
              <Link href="/how-it-works">
                <Button variant="outline" className="group">
                  How it Works
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
