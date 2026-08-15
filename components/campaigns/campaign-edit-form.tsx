"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteCampaign, updateCampaign } from "@/app/actions/campaign-actions"
import type { Campaign } from "@/lib/db/types"
import { AlertCircle, DollarSign, FileText, Loader2, Tag, Trash2, Upload } from "lucide-react"

const categories = [
  "Education",
  "Healthcare",
  "Technology",
  "Community",
  "Environment",
  "Arts & Culture",
  "Sports",
  "Business",
  "Emergency",
  "Other",
]

interface CampaignEditFormProps {
  campaign: Pick<
    Campaign,
    "id" | "title" | "description" | "goal_amount" | "category" | "image_url" | "current_amount"
  >
}

export function CampaignEditForm({ campaign }: CampaignEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(campaign.image_url)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const formData = new FormData(e.currentTarget)
      if (campaign.image_url && !formData.get("imageUrl")) {
        formData.set("imageUrl", campaign.image_url)
      }

      const result = await updateCampaign(campaign.id, formData)

      if (!result.success) {
        throw new Error(result.error || "Failed to update campaign")
      }

      setSuccess("Campaign updated successfully.")
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update campaign")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError("")

    try {
      const result = await deleteCampaign(campaign.id)

      if (!result.success) {
        throw new Error(result.error || "Failed to delete campaign")
      }

      router.push("/dashboard")
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete campaign")
      setDeleting(false)
    }
  }

  const hasRaisedFunds = Number(campaign.current_amount) > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Edit Campaign
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Campaign Title *
              </Label>
              <Input
                id="title"
                name="title"
                defaultValue={campaign.title}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Campaign Story *</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={campaign.description ?? ""}
                required
                rows={6}
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalAmount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Funding Goal (USDC) *
              </Label>
              <Input
                id="goalAmount"
                name="goalAmount"
                type="number"
                defaultValue={Number(campaign.goal_amount)}
                required
                min="100"
                max="1000000"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Category *
              </Label>
              <Select name="category" defaultValue={campaign.category ?? undefined} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Campaign Image
              </Label>
              <Input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                  <img
                    src={imagePreview}
                    alt="Campaign preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                {success}
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4">
              <div className="flex gap-3">
                <Button type="submit" disabled={loading || deleting}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/campaigns/${campaign.id}`}>Cancel</Link>
                </Button>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={loading || deleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Campaign
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{campaign.title}&quot; and remove it from Thula Funds.
                      {hasRaisedFunds
                        ? " This campaign has received contributions — deletion cannot be undone."
                        : " This action cannot be undone."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(event) => {
                        event.preventDefault()
                        void handleDelete()
                      }}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Campaign"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
