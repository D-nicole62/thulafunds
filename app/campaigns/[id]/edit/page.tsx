import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CampaignEditForm } from "@/components/campaigns/campaign-edit-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

interface EditCampaignPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id: campaignId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const db = createAdminClient()
  const { data: campaign, error } = await db
    .from("campaigns")
    .select("id, title, description, goal_amount, category, image_url, current_amount, creator_id")
    .eq("id", campaignId)
    .maybeSingle()

  if (error || !campaign) {
    notFound()
  }

  if (campaign.creator_id !== user.id) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-bold mb-2">Edit Campaign</h1>
            <p className="text-muted-foreground">
              Update your campaign details or delete the campaign if you no longer need it.
            </p>
          </div>
          <CampaignEditForm campaign={campaign} />
        </div>
      </div>
    </div>
  )
}
