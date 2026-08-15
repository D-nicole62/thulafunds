import { redirect } from "next/navigation"
import { CampaignCreateWrapper } from "@/components/campaigns/campaign-create-wrapper"

export default function CreateCampaignPage() {
  // Middleware handles initial session check and redirect.
  // Server-side getUser() in actions provides additional security.

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Your Campaign</h1>
            <p className="text-muted-foreground">
              Share your story and start raising funds. Choose mobile money, card, or Stellar — Freighter is optional.
            </p>
          </div>
          <CampaignCreateWrapper />
        </div>
      </div>
    </div>
  )
}
