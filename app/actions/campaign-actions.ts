"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

interface CampaignData {
  title: string
  description: string
  goalAmount: string
  category: string
  imageUrl: string
  walletAddress: string
}

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

    // Ensure user has a profile
    let profile = await prisma.profile.findUnique({
      where: { id: user.id }
    })

    if (!profile) {
      console.log("Creating profile for user:", user.id)
      // Create profile if it doesn't exist
      try {
        profile = await prisma.profile.create({
          data: {
            id: user.id,
            full_name: user.user_metadata?.full_name || "User",
            created_at: new Date(),
            updated_at: new Date()
          }
        })
      } catch (createProfileError: any) {
        console.error("Failed to create profile:", createProfileError)
        return {
          error: `Failed to create user profile: ${createProfileError.message}`,
          success: false,
        }
      }
    }

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const goalAmount = formData.get("goalAmount") as string
    const category = formData.get("category") as string
    const walletAddress = formData.get("walletAddress") as string
    const imageFile = formData.get("image") as File | null

    // Validate required fields
    if (!title?.trim()) return { error: "Campaign title is required", success: false }
    if (!description?.trim()) return { error: "Campaign description is required", success: false }
    if (!goalAmount) return { error: "Goal amount is required", success: false }
    if (!category) return { error: "Category is required", success: false }
    if (!walletAddress) return { error: "Wallet address is required", success: false }

    const { isValidStellarAddress, normalizeStellarAddress } = await import("@/lib/stellar/validation")
    const normalizedWallet = normalizeStellarAddress(walletAddress)
    if (!isValidStellarAddress(normalizedWallet)) {
      return { error: "Invalid Stellar wallet address format", success: false }
    }

    // Validate and parse goal amount
    const goalAmountNum = Number.parseFloat(goalAmount)
    if (isNaN(goalAmountNum) || goalAmountNum < 100 || goalAmountNum > 1000000) {
      return { error: "Goal amount must be between $100 and $1,000,000", success: false }
    }

    // Handle Image Upload
    let imageUrl = ""
    if (imageFile && imageFile.size > 0 && imageFile.name !== "undefined") {
      try {
        const { uploadFile } = await import("@/lib/file-upload")
        imageUrl = await uploadFile(imageFile)
      } catch (uploadError: any) {
        console.error("Image upload failed:", uploadError)
        return { error: "Failed to upload image: " + uploadError.message, success: false }
      }
    }

    console.log("Validation passed, inserting campaign...")

    // Prepare campaign data
    // Insert campaign into database
    let data;
    try {
      data = await prisma.campaign.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          goal_amount: goalAmountNum,
          category,
          image_url: imageUrl || null,
          wallet_address: normalizedWallet,
          payment_method: "soroban_escrow",
          creator_id: user.id,
          status: "active",
          current_amount: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }
      })
    } catch (error: any) {
      console.error("Database error details:", error)
      return {
        error: `Failed to create campaign: ${error.message || "Unknown database error"}`,
        success: false,
      }
    }

    if (!data) {
      return { error: "Campaign was created but no data was returned", success: false }
    }

    console.log("Campaign created successfully:", data)

    // Update user profile with wallet address if not already set
    try {
      await prisma.profile.update({
        where: { id: user.id },
        data: {
          wallet_address: normalizedWallet,
          wallet_type: "freighter",
          wallet_verified: true,
          updated_at: new Date(),
        }
      })
    } catch (profileError) {
      console.warn("Failed to update profile wallet:", profileError)
      // Don't fail campaign creation if profile update fails
    }

    // Revalidate relevant paths
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

    if (!user) throw new Error("User not authenticated")

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const goalAmount = formData.get("goalAmount") as string
    const category = formData.get("category") as string
    const imageUrl = formData.get("imageUrl") as string

    const data = await prisma.campaign.update({
      where: {
        id: campaignId,
        creator_id: user.id // Ensure ownership
      },
      data: {
        title: title.trim(),
        description: description.trim(),
        goal_amount: Number.parseFloat(goalAmount),
        category,
        image_url: imageUrl || null,
        updated_at: new Date(),
      }
    })

    revalidatePath("/dashboard")
    revalidatePath("/campaigns")
    revalidatePath(`/campaigns/${campaignId}`)

    return data
  } catch (error) {
    console.error("updateCampaign error:", error)
    throw error
  }
}

export async function deleteCampaign(campaignId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("User not authenticated")

    await prisma.campaign.delete({
      where: {
        id: campaignId,
        creator_id: user.id
      }
    })

    revalidatePath("/dashboard")
    revalidatePath("/campaigns")

    return { success: true }
  } catch (error) {
    console.error("deleteCampaign error:", error)
    throw error
  }
}
