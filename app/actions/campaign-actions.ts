"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { upsertProfile, nowIso } from "@/lib/db/helpers"

export async function createCampaignAction(formData: FormData) {
  try {
    console.log("createCampaignAction called")

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error("Auth error:", authError)
      return {
        error: `Authentication failed: ${authError.message}`,
        success: false,
      }
    }

    if (!user) {
      return {
        error: "You must be logged in to create a campaign. Please sign in and try again.",
        success: false,
      }
    }

    console.log("User authenticated:", user.id)

    const db = createAdminClient()

    const { data: profile } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle()

    if (!profile) {
      console.log("Creating profile for user:", user.id)
      try {
        await upsertProfile(user.id, {
          full_name: user.user_metadata?.full_name || "User",
        })
      } catch (createProfileError: unknown) {
        console.error("Failed to create profile:", createProfileError)
        return {
          error: `Failed to create user profile: ${createProfileError instanceof Error ? createProfileError.message : "Unknown error"}`,
          success: false,
        }
      }
    }

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const goalAmount = formData.get("goalAmount") as string
    const category = formData.get("category") as string
    const walletAddress = formData.get("walletAddress") as string
    const deadlineRaw = formData.get("deadline") as string
    const imageFile = formData.get("image") as File | null

    if (!title?.trim()) return { error: "Campaign title is required", success: false }
    if (!description?.trim()) return { error: "Campaign description is required", success: false }
    if (!goalAmount) return { error: "Goal amount is required", success: false }
    if (!category) return { error: "Category is required", success: false }
    if (!walletAddress) return { error: "Wallet address is required", success: false }
    if (!deadlineRaw) return { error: "Campaign deadline is required", success: false }

    const deadline = new Date(deadlineRaw + "T23:59:59Z")
    if (isNaN(deadline.getTime()) || deadline <= new Date()) {
      return { error: "Deadline must be a future date", success: false }
    }

    const { isValidStellarAddress, normalizeStellarAddress } = await import("@/lib/stellar/validation")
    const normalizedWallet = normalizeStellarAddress(walletAddress)
    if (!isValidStellarAddress(normalizedWallet)) {
      return { error: "Invalid Stellar wallet address format", success: false }
    }

    const goalAmountNum = Number.parseFloat(goalAmount)
    if (isNaN(goalAmountNum) || goalAmountNum < 100 || goalAmountNum > 1000000) {
      return { error: "Goal amount must be between $100 and $1,000,000", success: false }
    }

    let imageUrl = ""
    if (imageFile && imageFile.size > 0 && imageFile.name !== "undefined") {
      try {
        const { uploadFile } = await import("@/lib/file-upload")
        imageUrl = await uploadFile(imageFile)
      } catch (uploadError: unknown) {
        const msg = uploadError instanceof Error ? uploadError.message : "Image upload failed"
        console.error("Image upload failed:", uploadError)
        if (msg.includes("Bucket not found")) {
          return {
            error:
              "Image storage is not set up. Run `pnpm setup:storage` or create a public 'campaigns' bucket in Supabase Storage, then try again. You can also create the campaign without an image.",
            success: false,
          }
        }
        return { error: `Failed to upload image: ${msg}`, success: false }
      }
    }

    console.log("Validation passed, inserting campaign...")

    const { data, error } = await db
      .from("campaigns")
      .insert({
        title: title.trim(),
        description: description.trim(),
        goal_amount: goalAmountNum,
        category,
        image_url: imageUrl || null,
        wallet_address: normalizedWallet,
        payment_method: "soroban_escrow",
        deadline: deadline.toISOString(),
        creator_id: user.id,
        status: "active",
        current_amount: 0,
        on_chain_balance: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
      })
      .select()
      .single()

    if (error) {
      console.error("Database error details:", error)
      return {
        error: `Failed to create campaign: ${error.message}`,
        success: false,
      }
    }

    if (!data) {
      return { error: "Campaign was created but no data was returned", success: false }
    }

    console.log("Campaign created successfully:", data)

    try {
      await db
        .from("profiles")
        .update({
          wallet_address: normalizedWallet,
          wallet_type: "freighter",
          wallet_verified: true,
          updated_at: nowIso(),
        })
        .eq("id", user.id)
    } catch (profileError) {
      console.warn("Failed to update profile wallet:", profileError)
    }

    try {
      revalidatePath("/dashboard")
      revalidatePath("/campaigns")
      revalidatePath(`/campaigns/${data.id}`)
    } catch (revalidateError) {
      console.warn("Revalidation warning:", revalidateError)
    }

    return {
      success: true,
      data,
      campaignId: data.id,
    }
  } catch (error) {
    console.error("createCampaignAction error:", error)
    return {
      error: error instanceof Error ? error.message : "An unexpected error occurred while creating the campaign",
      success: false,
    }
  }
}

export async function updateCampaign(campaignId: string, formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "You must be logged in to update a campaign" }
    }

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const goalAmount = formData.get("goalAmount") as string
    const category = formData.get("category") as string
    const existingImageUrl = formData.get("imageUrl") as string
    const imageFile = formData.get("image") as File | null

    if (!title?.trim()) return { success: false, error: "Campaign title is required" }
    if (!description?.trim()) return { success: false, error: "Campaign description is required" }
    if (!goalAmount) return { success: false, error: "Goal amount is required" }
    if (!category) return { success: false, error: "Category is required" }

    const goalAmountNum = Number.parseFloat(goalAmount)
    if (isNaN(goalAmountNum) || goalAmountNum < 100 || goalAmountNum > 1000000) {
      return { success: false, error: "Goal amount must be between $100 and $1,000,000" }
    }

    let imageUrl = existingImageUrl || ""
    if (imageFile && imageFile.size > 0 && imageFile.name !== "undefined") {
      try {
        const { uploadFile } = await import("@/lib/file-upload")
        imageUrl = await uploadFile(imageFile)
      } catch (uploadError: unknown) {
        const msg = uploadError instanceof Error ? uploadError.message : "Image upload failed"
        console.error("Image upload failed:", uploadError)
        return { success: false, error: `Failed to upload image: ${msg}` }
      }
    }

    const db = createAdminClient()
    const { data, error } = await db
      .from("campaigns")
      .update({
        title: title.trim(),
        description: description.trim(),
        goal_amount: goalAmountNum,
        category,
        image_url: imageUrl || null,
        updated_at: nowIso(),
      })
      .eq("id", campaignId)
      .eq("creator_id", user.id)
      .select()
      .single()

    if (error) {
      return { success: false, error: `Failed to update campaign: ${error.message}` }
    }

    revalidatePath("/dashboard")
    revalidatePath("/campaigns")
    revalidatePath("/campaigns/manage")
    revalidatePath(`/campaigns/${campaignId}`)
    revalidatePath(`/campaigns/${campaignId}/edit`)

    return { success: true, data }
  } catch (error) {
    console.error("updateCampaign error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while updating the campaign",
    }
  }
}

export async function deleteCampaign(campaignId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "You must be logged in to delete a campaign" }
    }

    const db = createAdminClient()
    const { error } = await db
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("creator_id", user.id)

    if (error) {
      return { success: false, error: `Failed to delete campaign: ${error.message}` }
    }

    revalidatePath("/dashboard")
    revalidatePath("/campaigns")
    revalidatePath("/campaigns/manage")
    revalidatePath(`/campaigns/${campaignId}`)
    revalidatePath(`/campaigns/${campaignId}/edit`)

    return { success: true }
  } catch (error) {
    console.error("deleteCampaign error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while deleting the campaign",
    }
  }
}
