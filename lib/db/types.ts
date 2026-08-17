/** Row types for Supabase `public` tables (formerly Prisma models). */

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  wallet_address: string | null
  wallet_type: string | null
  wallet_verified: boolean
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  created_at: string
  updated_at: string
  title: string
  description: string | null
  current_amount: number | string
  on_chain_balance: number | string
  goal_amount: number | string
  status: string
  category: string | null
  image_url: string | null
  wallet_address: string | null
  contract_address: string | null
  milestone_contract_address: string | null
  payment_method: string | null
  deadline: string | null
  creator_id: string
  is_boosted: boolean
  boost_type: string | null
  boost_expires_at: string | null
}

export interface CampaignUpdate {
  id: string
  created_at: string
  title: string
  content: string
  campaign_id: string
}

export interface Donation {
  id: string
  created_at: string
  amount: number | string
  message: string | null
  anonymous: boolean
  tx_hash: string
  payment_method: string | null
  status: string | null
  currency: string | null
  campaign_id: string
  contributor_id: string | null
  donor_name?: string | null
}

export interface CampaignBoost {
  id: string
  campaign_id: string
  boost_type: string
  duration_hours: number
  status: string
  payment_proof: string
  created_at: string
  expires_at: string
}

export interface PaymentSession {
  id: string
  created_at: string
  tx_hash: string
  endpoint: string
  status: string
  amount: number | string
  from_address: string | null
}
