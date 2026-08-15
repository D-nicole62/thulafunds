import { createAdminClient } from "@/lib/supabase/admin"

export async function uploadFile(file: File, bucket: string = "campaigns"): Promise<string> {
  const supabase = createAdminClient()

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const fileExt = file.name.split(".").pop() || "jpg"
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
  const filePath = fileName

  const { error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  })

  if (error) {
    if (error.message.toLowerCase().includes("bucket not found")) {
      throw new Error("Bucket not found")
    }
    throw new Error(`Upload failed: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath)

  return publicUrl
}
