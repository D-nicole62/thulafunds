import { Card, CardContent } from "@/components/ui/card"

export function FeaturesSection() {
  const features = [
    {
      title: "Blockchain Security",
      description: "Your funds are protected by cryptographic security and smart contracts.",
    },
    {
      title: "Instant Transfers",
      description: "Receive contributions immediately with fast blockchain transactions.",
    },
    {
      title: "Global Reach",
      description: "Accept contributions from anywhere in the world without restrictions.",
    },
    {
      title: "Web3 Integration",
      description: "Connect your wallet for seamless crypto and fiat transactions.",
    },
    {
      title: "Community Driven",
      description: "Build a community around your cause with social features.",
    },
    // {
    //   title: "Mobile First",
    //   description: "Optimized for mobile devices with a responsive design.",
    // },
  ]

  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to succeed</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features designed to help you reach your fundraising goals
          </p>
        </div>

        <div className="grid gap-4 md:gap-6">
          {/* First row - 2 large cards */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                    Security
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{features[0].title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{features[0].description}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-950">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-medium">
                    Speed
                  </div>
                  <h3 className="text-xl font-bold text-blue-950">{features[1].title}</h3>
                  <p className="text-blue-900/80 leading-relaxed">{features[1].description}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second row - 3 medium cards */}
          <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-2 w-12 bg-gradient-to-r from-green-400 to-green-600 rounded-full"></div>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {features[2].title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{features[2].description}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-2 w-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {features[3].title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{features[3].description}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group sm:col-span-2 lg:col-span-1">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-2 w-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"></div>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {features[4].title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{features[4].description}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Third row - 1 wide card */}
          {/* <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-slate-50 to-slate-100">
            <CardContent className="p-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-sm font-medium mb-4">
                  Experience
                </div>
                <h3 className="text-xl font-bold mb-3">{features[5].title}</h3>
                <p className="text-muted-foreground leading-relaxed">{features[5].description}</p>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </section>
  )
}
